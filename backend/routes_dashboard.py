from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any, List
from datetime import datetime
from bson import ObjectId
from db_utils import normalize_object_ids

router = APIRouter()

@router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    db = request.app.state.db
    
    try:
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day).isoformat()
        current_month_start = datetime(now.year, now.month, 1).isoformat()
        
        # 1. Basic counts (filter out malformed documents)
        total_orders = await db.orders.count_documents({"createdAt": {"$exists": True, "$ne": None, "$regex": "^\\d{4}-\\d{2}-\\d{2}"}})
        total_customers = await db.customers.count_documents({})
        total_products = await db.products.count_documents({})
        
        # 2. Today's metrics
        todays_orders = await db.orders.count_documents({"createdAt": {"$gte": today_start, "$regex": "^\\d{4}-\\d{2}-\\d{2}"}})
        
        # 3. Revenue & Payment metrics (Aggregated)
        # Filter out invalid documents before running the facets
        analytics_pipeline = [
            {
                "$match": {
                    "createdAt": {"$exists": True, "$ne": None, "$regex": "^\\d{4}-\\d{2}-\\d{2}"},
                    "total": {"$exists": True, "$ne": None}
                }
            },
            {
                "$facet": {
                    "monthTotals": [
                        {
                            "$match": {
                                "createdAt": {"$gte": current_month_start},
                                "status": {"$ne": "Cancelled"},
                                "$or": [
                                    {"paymentStatus": "Paid"},
                                    {"paymentStatus": "paid"},
                                    {"payment.status": "paid"},
                                    {"payment.status": "Paid"},
                                    {"paymentMethod": {"$in": ["Cash", "Card", "cash", "card"]}},
                                    {"source": "pos"}
                                ]
                            }
                        },
                        {
                            "$group": {
                                "_id": None,
                                "revenue": {"$sum": {"$toDouble": "$total"}}
                            }
                        }
                    ],
                    "totals": [
                        {
                            "$group": {
                                "_id": None,
                                "totalRevenue": {
                                    "$sum": {
                                        "$cond": [
                                            {"$eq": ["$payment.status", "paid"]}, 
                                            {"$toDouble": "$total"}, 
                                            0
                                        ]
                                    }
                                },
                                "pendingAmount": {
                                    "$sum": {
                                        "$cond": [
                                            {"$ne": ["$payment.status", "paid"]}, 
                                            {"$toDouble": "$total"}, 
                                            0
                                        ]
                                    }
                                },
                                "pendingCount": {
                                    "$sum": {
                                        "$cond": [
                                            {"$ne": ["$payment.status", "paid"]}, 
                                            1, 
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    "methodBreakdown": [
                        {"$group": {"_id": "$payment.method", "count": {"$sum": 1}, "total": {"$sum": {"$toDouble": "$total"}}}}
                    ],
                    "statusBreakdown": [
                        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
                    ],
                    "salesTrend": [
                        {
                            "$addFields": {
                                "date": {"$dateFromString": {"dateString": "$createdAt"}}
                            }
                        },
                        {
                            "$group": {
                                "_id": {
                                    "year": {"$year": "$date"},
                                    "month": {"$month": "$date"}
                                },
                                "sales": {"$sum": {"$toDouble": "$total"}}
                            }
                        },
                        {"$sort": {"_id.year": 1, "_id.month": 1}},
                        {"$limit": 12}
                    ],
                    "categorySales": [
                        {"$match": {"items": {"$exists": True, "$type": "array"}}},
                        {"$unwind": "$items"},
                        {
                            "$lookup": {
                                "from": "products",
                                "localField": "items.product_id",
                                "foreignField": "_id",
                                "as": "productInfo"
                            }
                        },
                        {"$unwind": "$productInfo"},
                        {
                            "$group": {
                                "_id": "$productInfo.category",
                                "value": {"$sum": {"$multiply": [{"$toDouble": "$items.price"}, "$items.quantity"]}}
                            }
                        },
                        {"$sort": {"value": -1}},
                        {"$limit": 6}
                    ],
                    "topSellingProducts": [
                        {"$match": {"items": {"$exists": True, "$type": "array"}}},
                        {"$unwind": "$items"},
                        {
                            "$group": {
                                "_id": "$items.product_id",
                                "product": {"$first": "$items.productName"},
                                "units": {"$sum": "$items.quantity"},
                                "revenue": {"$sum": {"$multiply": [{"$toDouble": "$items.price"}, "$items.quantity"]}}
                            }
                        },
                        {"$sort": {"units": -1}},
                        {"$limit": 5}
                    ]
                }
            }
        ]
        
        agg_results = await db.orders.aggregate(analytics_pipeline).to_list(1)
        data = agg_results[0]
        
        totals = data["totals"][0] if data["totals"] else {"totalRevenue": 0, "pendingAmount": 0, "pendingCount": 0}
        month_totals = data.get("monthTotals", [None])[0] if data.get("monthTotals") else {"revenue": 0}
        if not month_totals:
            month_totals = {"revenue": 0}
            
        methods = {item["_id"] or "unknown": {"count": item["count"], "amount": item["total"]} for item in data["methodBreakdown"]}
        statuses = {item["_id"] or "unknown": item["count"] for item in data["statusBreakdown"]}
        
        # Format Trend for Recharts
        trend = []
        for t in data["salesTrend"]:
            _id_val = t.get("_id") or {}
            year = _id_val.get("year")
            month = _id_val.get("month")
            if year is not None and month is not None:
                month_label = datetime(int(year), int(month), 1).strftime("%b %y")
                trend.append({"month": month_label, "sales": t["sales"], "target": t["sales"] * 1.1})
            
        # Format Categories
        cat_sales = []
        total_cat_val = sum(c["value"] for c in data["categorySales"]) or 1
        for c in data["categorySales"]:
            cat_sales.append({
                "name": c["_id"],
                "value": c["value"],
                "percentage": round((c["value"] / total_cat_val) * 100)
            })

        # 4. Total COD Orders specifically requested
        total_cod = await db.orders.count_documents({"payment.method": "cod"})

        # 5. Recent Activity
        recent_orders_pipeline = [
            {"$sort": {"createdAt": -1}},
            {"$limit": 8},
            {
                "$lookup": {
                    "from": "customers",
                    "localField": "customer_id",
                    "foreignField": "_id",
                    "as": "customer"
                }
            },
            {"$unwind": {"path": "$customer", "preserveNullAndEmptyArrays": True}},
            {
                "$project": {
                    "_id": 1,
                    "total": 1,
                    "status": 1,
                    "createdAt": 1,
                    "payment": 1,
                    "customerName": {"$ifNull": ["$customer.fullName", "$customer.name", "Walk-in Customer"]},
                    "itemsCount": {
                        "$cond": [
                            {"$isArray": "$items"},
                            {"$size": "$items"},
                            0
                        ]
                    }
                }
            }
        ]
        recent_orders = await db.orders.aggregate(recent_orders_pipeline).to_list(None)
        for o in recent_orders: o["_id"] = str(o["_id"])
            
        # Sum expenses for this month
        current_month_prefix = now.strftime("%Y-%m")
        month_expenses = 0.0
        expense_cursor = db.expenses.find({"date": {"$regex": f"^{current_month_prefix}"}})
        async for exp in expense_cursor:
            month_expenses += float(exp.get("amount") or 0)

        month_rev = float(month_totals.get("revenue") or 0)

        # Format Top Selling Products
        top_selling = []
        for item in data.get("topSellingProducts", []):
            prod_name = item.get("product") or "Unknown Product"
            top_selling.append({
                "product": prod_name,
                "units": int(item.get("units") or 0),
                "revenue": float(item.get("revenue") or 0)
            })

        return {
            "totalOrders": total_orders,
            "totalCustomers": total_customers,
            "totalProducts": total_products,
            "todaysOrders": todays_orders,
            "totalRevenue": totals.get("totalRevenue", 0),
            "pendingPaymentsCount": totals.get("pendingCount", 0),
            "pendingPaymentsAmount": totals.get("pendingAmount", 0),
            "totalCODOrders": total_cod,
            "statusBreakdown": statuses,
            "methodBreakdown": methods,
            "salesTrend": trend,
            "categorySales": cat_sales,
            "recentOrders": recent_orders,
            "topSellingProducts": top_selling,
            # Monthly metrics
            "monthRevenue": month_rev,
            "monthExpenses": month_expenses,
            "netProfit": month_rev - month_expenses
        }
        
    except Exception as e:
        print(f"DASHBOARD STATS ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
