from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict


class Category(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None


class Brand(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    description: Optional[str] = None


class Supplier(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str # Contact person name
    company: str # Company name
    phone: str # Contact phone
    address: Optional[str] = None
    createdAt: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class ProductCreate(BaseModel):
    name: str
    code: Optional[str] = None
    size: Optional[str] = None
    company: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    purchasePrice: float = 0
    salePrice: float = 0
    unit: Optional[str] = None
    tags: Optional[List[str]] = None
    category_id: Optional[str] = None
    brand_id: Optional[str] = None
    supplier_id: Optional[str] = None
    currentStock: Optional[int] = None
    minStock: Optional[int] = None
    maxStock: Optional[int] = None
    image: Optional[str] = None
    supplier: Optional[str] = None
    branch: Optional[str] = None
    status: Optional[str] = None


class Product(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    code: Optional[str] = None
    size: Optional[str] = None
    company: Optional[str] = None
    type: Optional[str] = None
    purchasePrice: float
    salePrice: float
    unit: Optional[str] = None
    tags: Optional[List[str]] = None
    category_id: Optional[str] = None
    brand_id: Optional[str] = None
    supplier_id: Optional[str] = None
    image: Optional[str] = None
    supplier: Optional[str] = None
    branch: Optional[str] = None
    status: Optional[str] = None


class User(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    username: str
    password: str
    role: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


class Customer(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    fullName: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Lahore"
    customerType: str = "Retail"
    status: str = "Active"
    creditLimit: float = 0.0
    openingBalance: float = 0.0
    totalPurchases: float = 0.0
    totalPaid: float = 0.0
    balanceDue: float = 0.0
    orders: List[str] = []
    purchaseHistory: List[Dict[str, Any]] = []
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class OrderItem(BaseModel):
    product_id: str = Field(..., alias="productId")
    quantity: int
    price: float = Field(..., alias="unitPrice")
    discount_id: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class TrackingEntry(BaseModel):
    status: str
    timestamp: str
    message: Optional[str] = None


class PaymentDetails(BaseModel):
    bankName: Optional[str] = None
    accountTitle: Optional[str] = None
    accountNumber: Optional[str] = None
    transactionId: Optional[str] = None
    mobileNumber: Optional[str] = None


class OrderPaymentInfo(BaseModel):
    method: str
    details: Optional[PaymentDetails] = None
    status: str = "pending"


class Order(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    customer_id: Optional[str] = None
    customer: Optional[Dict[str, Any]] = None  # Temporary snippet from frontend
    user_id: Optional[str] = None
    items: List[OrderItem]
    total: float
    status: str = "pending"
    paymentStatus: str = "unpaid"
    payment: Optional[OrderPaymentInfo] = None
    trackingHistory: List[TrackingEntry] = []

    model_config = ConfigDict(extra="allow")


class Payment(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    order_id: Optional[str] = None
    customer_id: Optional[str] = None
    supplier_id: Optional[str] = None
    amount: float
    method: Optional[str] = "Cash"
    date: Optional[str] = None
    status: Optional[str] = "Completed"
    reference: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class Transaction(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    type: str  # payment, expense, income, salary, order_payment
    amount: float
    method: str  # cash, bank_transfer, card, etc.
    referenceId: Optional[str] = None
    referenceType: Optional[str] = None  # Order, Employee, Expense, Supplier
    date: str
    description: Optional[str] = None
    status: Optional[str] = "Completed"

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class Branch(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    address: Optional[str] = None
    manager_employee_id: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    openingDate: Optional[str] = None
    status: str = "Active"

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class Employee(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    fullName: str = Field(..., alias="name")
    fatherName: Optional[str] = None
    cnic: Optional[str] = None
    dateOfBirth: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    basicSalary: Optional[float] = None
    allowances: Optional[float] = None
    salary: Optional[float] = None
    joinDate: Optional[str] = None
    branch: Optional[str] = None
    bankName: Optional[str] = None
    accountNumber: Optional[str] = None
    emergencyContact: Optional[str] = None
    emergencyPhone: Optional[str] = None
    status: Optional[str] = None
    position: Optional[str] = None
    branch_id: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class InventoryItem(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    product_id: str
    quantity: int
    location: Optional[str] = None
    branch_id: Optional[str] = None
    minStock: Optional[int] = None
    maxStock: Optional[int] = None
    lastUpdated: Optional[str] = None


class CartItem(BaseModel):
    product_id: str
    quantity: int


class Cart(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    items: List[CartItem]


class WishlistItem(BaseModel):
    product_id: str


class Wishlist(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    items: List[WishlistItem]


class Warranty(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    sale_id: Optional[str] = None
    product_id: str
    customer_id: str
    start_date: str # ISO format or YYYY-MM-DD
    end_date: str # ISO format or YYYY-MM-DD
    status: str = "Active" # Active, Expired, Claimed
    serial_no: Optional[str] = None
    details: Optional[str] = None
    claimHistory: List[Dict[str, Any]] = []

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class ReturnRequest(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    orderId: str
    customer_id: Optional[str] = None
    productId: str
    productName: Optional[str] = None
    price: Optional[float] = 0.0
    reason: str
    refundAmount: Optional[float] = 0.0
    status: str = "requested"
    createdAt: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")

class PurchaseItem(BaseModel):
    product_id: str = Field(..., alias="productId")
    productName: Optional[str] = None
    quantity: float
    price: float
    total: float

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class PurchaseOrder(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    poNo: Optional[str] = None
    supplierId: str
    supplierName: Optional[str] = None
    date: str
    items: List[PurchaseItem]
    totalAmount: float
    paidAmount: float = 0.0
    paymentMethod: str = "Cash"
    paymentStatus: str = "Credit"
    receivedStatus: str = "Pending"
    notes: Optional[str] = None
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")
