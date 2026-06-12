from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any, List
from datetime import datetime
from bson import ObjectId
from db_utils import normalize_object_ids, parse_object_id
from models import ReturnRequest

router = APIRouter()

@router.get("/returns")
async def get_returns(request: Request):
    db = request.app.state.db
    try:
        cursor = db.returns.find({})
        results = []
        async for doc in cursor:
            results.append(normalize_object_ids(doc))
        return results
    except Exception as e:
        print(f"Error fetching returns: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/returns")
async def add_return(payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    
    # 3. ADD DEBUG LOGGING
    print(f"DEBUG: Return Payload Received: {payload}")

    return_type = str(payload.get("returnType") or payload.get("type") or "customer").lower()

    # Supplier returns are stored directly and linked to the chosen supplier,
    # while customer returns remain linked to the originating order.
    if return_type == "supplier":
        supplier_id = payload.get("supplierId") or payload.get("supplier_id")
        if not supplier_id:
            raise HTTPException(status_code=400, detail="supplierId is required for supplier returns")
        if not payload.get("productName"):
            raise HTTPException(status_code=400, detail="productName is required for supplier returns")

        try:
            supplier_query = {"_id": parse_object_id(supplier_id, "supplierId")}
            supplier = await db.suppliers.find_one(supplier_query)
            if not supplier:
                raise HTTPException(status_code=404, detail="Supplier not found")

            if not payload.get("status"):
                payload["status"] = "requested"
            if not payload.get("createdAt"):
                payload["createdAt"] = datetime.utcnow().isoformat()

            payload["supplierId"] = str(supplier.get("_id"))
            payload["supplierName"] = payload.get("supplierName") or supplier.get("company") or supplier.get("name")
            payload["returnType"] = "supplier"
            payload["type"] = "supplier"

            return_data = dict(payload)
            res = await db.returns.insert_one(return_data)
            return_data["_id"] = str(res.inserted_id)

            print(f"DEBUG: Supplier return {return_data['_id']} saved for supplier {return_data['supplierId']}")
            return return_data
        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"ERROR: Supplier Return Save Error: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to process supplier return: {str(e)}")
    
    order_id_str = payload.get("orderId")
    product_id_str = payload.get("productId")
    
    # 4. VALIDATION CHECK - REQUIRED FIELDS
    if not order_id_str:
        raise HTTPException(status_code=400, detail="orderId is required")
    if not product_id_str:
        raise HTTPException(status_code=400, detail="productId is required")
    if not payload.get("reason"):
        raise HTTPException(status_code=400, detail="reason is required")

    try:
        # 1. LINK RETURNS WITH SALES (FETCH ORDER)
        # Handle cases where ID might be a string or ObjectId
        query = {"_id": order_id_str}
        if ObjectId.is_valid(order_id_str):
            query = {"$or": [{"_id": ObjectId(order_id_str)}, {"_id": order_id_str}]}
            
        order = await db.orders.find_one(query)
            
        if not order:
            print(f"DEBUG: Order {order_id_str} not found")
            raise HTTPException(status_code=404, detail=f"Order {order_id_str} not found")

        # 2. VALIDATE PRODUCT AGAINST ORDER
        items = order.get("items", [])
        matched_item = None
        for item in items:
            # Check for product_id (string or ObjectId)
            item_p_id = str(item.get("product_id") or item.get("productId") or "")
            if item_p_id == product_id_str:
                matched_item = item
                break
        
        if not matched_item:
            print(f"DEBUG: Product {product_id_str} not found in order {order_id_str}")
            raise HTTPException(status_code=400, detail="Product not part of this order")

        # 3. AUTO-FILL PRODUCT DATA (NO MANUAL ENTRY)
        p_name = matched_item.get("name") or matched_item.get("productName") or "Unknown Product"
        # If order doesn't have name, try to fetch from products collection
        if p_name == "Unknown Product" and ObjectId.is_valid(product_id_str):
            prod_doc = await db.products.find_one({"_id": ObjectId(product_id_str)})
            if prod_doc:
                p_name = prod_doc.get("name", "Unknown Product")

        p_price = matched_item.get("price") or matched_item.get("unitPrice") or 0.0
        
        # Prepare return data
        payload["productName"] = p_name
        payload["price"] = float(p_price)
        payload["customer_id"] = str(order.get("customer_id")) if order.get("customer_id") else None
        
        if "status" not in payload:
            payload["status"] = "requested"
        if "refundAmount" not in payload:
            payload["refundAmount"] = float(p_price)
        if "createdAt" not in payload:
            payload["createdAt"] = datetime.utcnow().isoformat()
            
        # 5. SAVE TO DATABASE
        return_obj = ReturnRequest(**payload)
        return_data = return_obj.model_dump(by_alias=True, exclude={"id"})
        
        res = await db.returns.insert_one(return_data)
        return_id = str(res.inserted_id)
        return_data["_id"] = return_id
        
        # 6. UPDATE ORDER AFTER RETURN
        await db.orders.update_one(
            {"_id": order["_id"]},
            {"$push": {"returns": return_id}}
        )
        
        # 7. UPDATE CUSTOMER AFTER RETURN
        if return_data.get("customer_id"):
            refund_amt = float(return_data.get("refundAmount", 0))
            await db.customers.update_one(
                {"_id": parse_object_id(return_data["customer_id"], "customer_id")},
                {
                    "$inc": {
                        "totalReturns": refund_amt,
                        "balanceDue": -refund_amt
                    }
                }
            )
        
        print(f"DEBUG: Return {return_id} saved and linked to order {order_id_str}")
        print(f"DEBUG: Saved Document: {return_data}")
        
        return return_data
    except HTTPException as he:
        raise he
    except Exception as e:
        # 7. ERROR HANDLING
        print(f"ERROR: Return Save Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process return: {str(e)}")

@router.put("/returns/{return_id}")
async def update_return(return_id: str, payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    try:
        oid = parse_object_id(return_id, "return_id")
        
        # Remove ID from payload to avoid updating it
        payload.pop("_id", None)
        payload.pop("id", None)
        
        # Update entry
        res = await db.returns.update_one(
            {"_id": oid},
            {"$set": payload}
        )
        
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Return not found")
            
        return {"status": "success", "message": "Return updated"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error updating return: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/returns/{return_id}")
async def delete_return(return_id: str, request: Request):
    db = request.app.state.db
    try:
        oid = parse_object_id(return_id, "return_id")
        res = await db.returns.delete_one({"_id": oid})
        
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Return not found")
            
        return {"status": "success", "message": "Return deleted"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error deleting return: {e}")
        raise HTTPException(status_code=500, detail=str(e))
