import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://localhost:5000";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "products", label: "Products", icon: "◇" },
  { id: "inventory", label: "Inventory", icon: "▤" },
  { id: "customers", label: "Customers", icon: "♙" },
  { id: "orders", label: "Orders", icon: "🛒" },
  { id: "transactions", label: "Transactions", icon: "₹" },
  { id: "analytics", label: "Analytics", icon: "⌁" },
  { id: "system", label: "System", icon: "⚙" }
];

function App() {
  const [page, setPage] = useState("dashboard");

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [apiOnline, setApiOnline] = useState(false);
  const [mongoOnline, setMongoOnline] = useState(false);
  const [mysqlOnline, setMysqlOnline] = useState(false);

  const [search, setSearch] = useState("");

  const [modal, setModal] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  const [toast, setToast] = useState(null);

  const [loggedIn, setLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: ""
  });

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    category: "Electronics",
    price: "",
    sku: "",
    stock: "",
    status: "active"
  });

  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  const [orderForm, setOrderForm] = useState({
    customer_id: "",
    subtotal: "",
    tax: "",
    shipping: "0",
    payment_status: "pending",
    order_status: "pending"
  });

  const [transactionForm, setTransactionForm] = useState({
    order_id: "",
    customer_id: "",
    amount: "",
    payment_method: "UPI",
    status: "successful"
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const getList = (data, key) => {
    if (!data) return [];

    if (Array.isArray(data)) return data;

    if (Array.isArray(data[key])) return data[key];

    if (Array.isArray(data.data)) return data.data;

    return [];
  };

  const fetchJSON = async (url, options = {}) => {
    const response = await fetch(url, options);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
  };

  const loadData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const results = await Promise.allSettled([
        fetchJSON(`${API}/api/products`),
        fetchJSON(`${API}/api/customers`),
        fetchJSON(`${API}/api/orders`),
        fetchJSON(`${API}/api/transactions`),
        fetchJSON(`${API}/api/health`)
      ]);

      const productResult = results[0];
      const customerResult = results[1];
      const orderResult = results[2];
      const transactionResult = results[3];
      const healthResult = results[4];

      if (productResult.status === "fulfilled") {
        setProducts(getList(productResult.value, "products"));
      }

      if (customerResult.status === "fulfilled") {
        setCustomers(getList(customerResult.value, "customers"));
      }

      if (orderResult.status === "fulfilled") {
        setOrders(getList(orderResult.value, "orders"));
      }

      if (transactionResult.status === "fulfilled") {
        setTransactions(
          getList(transactionResult.value, "transactions")
        );
      }

      if (healthResult.status === "fulfilled") {
        setApiOnline(true);

        const health = healthResult.value;

        setMongoOnline(
          health?.databases?.mongodb === "connected"
        );

        setMysqlOnline(
          health?.databases?.mysql === "connected"
        );
      } else {
        setApiOnline(false);
        setMongoOnline(false);
        setMysqlOnline(false);
      }
    } catch (error) {
      console.error(error);
      setApiOnline(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const currency = (value) => {
    const amount = Number(value || 0);

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const totalRevenue = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.status === "successful"
      )
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );
  }, [transactions]);

  const pendingRevenue = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.status === "pending"
      )
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );
  }, [transactions]);

  const lowStockProducts = useMemo(() => {
    return products.filter(
      (product) => Number(product.stock || 0) <= 5
    );
  }, [products]);

  const activeProducts = useMemo(() => {
    return products.filter(
      (product) => product.status !== "inactive"
    );
  }, [products]);

  const pendingOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        String(order.order_status || "").toLowerCase() ===
        "pending"
    );
  }, [orders]);

  const searchValue = search.toLowerCase().trim();

  const filteredProducts = products.filter((product) => {
    if (!searchValue) return true;

    return (
      String(product.name || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(product.sku || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(product.category || "")
        .toLowerCase()
        .includes(searchValue)
    );
  });

  const filteredCustomers = customers.filter((customer) => {
    if (!searchValue) return true;

    return (
      String(customer.name || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(customer.email || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(customer.phone || "")
        .toLowerCase()
        .includes(searchValue)
    );
  });

  const filteredOrders = orders.filter((order) => {
    if (!searchValue) return true;

    return (
      String(order.id || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(order.customer_id || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(order.order_status || "")
        .toLowerCase()
        .includes(searchValue)
    );
  });

  const filteredTransactions = transactions.filter(
    (transaction) => {
      if (!searchValue) return true;

      return (
        String(transaction.id || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(transaction.order_id || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(transaction.payment_method || "")
          .toLowerCase()
          .includes(searchValue)
      );
    }
  );

  const openProductModal = (product = null) => {
    setEditingProduct(product);

    if (product) {
      setProductForm({
        name: product.name || "",
        description: product.description || "",
        category: product.category || "Electronics",
        price: product.price || "",
        sku: product.sku || "",
        stock: product.stock || "",
        status: product.status || "active"
      });
    } else {
      setProductForm({
        name: "",
        description: "",
        category: "Electronics",
        price: "",
        sku: "",
        stock: "",
        status: "active"
      });
    }

    setModal("product");
  };

  const openCustomerModal = () => {
    setCustomerForm({
      name: "",
      email: "",
      phone: "",
      address: ""
    });

    setModal("customer");
  };

  const openOrderModal = () => {
    setOrderForm({
      customer_id: customers[0]?.id || "",
      subtotal: "",
      tax: "",
      shipping: "0",
      payment_status: "pending",
      order_status: "pending"
    });

    setModal("order");
  };

  const openTransactionModal = () => {
    const firstOrder = orders[0];

    setTransactionForm({
      order_id: firstOrder?.id || "",
      customer_id:
        firstOrder?.customer_id ||
        customers[0]?.id ||
        "",
      amount: firstOrder?.total || "",
      payment_method: "UPI",
      status: "successful"
    });

    setModal("transaction");
  };

  const closeModal = () => {
    setModal(null);
    setEditingProduct(null);
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();

    if (
      !productForm.name ||
      !productForm.category ||
      !productForm.price ||
      !productForm.sku
    ) {
      showToast(
        "Please fill all required product fields.",
        "error"
      );
      return;
    }

    try {
      const body = {
        name: productForm.name,
        description: productForm.description,
        category: productForm.category,
        price: Number(productForm.price),
        sku: productForm.sku,
        stock: Number(productForm.stock || 0),
        status: productForm.status
      };

      if (editingProduct) {
        await fetchJSON(
          `${API}/api/products/${editingProduct._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
          }
        );

        showToast("Product updated successfully.");
      } else {
        await fetchJSON(`${API}/api/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        showToast("Product added successfully.");
      }

      closeModal();
      loadData(false);
    } catch (error) {
      console.error(error);
      showToast(error.message, "error");
    }
  };

  const deleteProduct = async (product) => {
    if (
      !window.confirm(
        `Delete "${product.name}" from the catalog?`
      )
    ) {
      return;
    }

    try {
      await fetchJSON(
        `${API}/api/products/${product._id}`,
        {
          method: "DELETE"
        }
      );

      showToast("Product deleted.");
      loadData(false);
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleCustomerSubmit = async (event) => {
    event.preventDefault();

    if (
      !customerForm.name ||
      !customerForm.email
    ) {
      showToast(
        "Customer name and email are required.",
        "error"
      );
      return;
    }

    try {
      await fetchJSON(`${API}/api/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: customerForm.name,
          email: customerForm.email,
          phone: customerForm.phone,
          address: customerForm.address
        })
      });

      closeModal();
      showToast("Customer added successfully.");
      loadData(false);
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleOrderSubmit = async (event) => {
    event.preventDefault();

    if (!orderForm.customer_id) {
      showToast("Select a customer.", "error");
      return;
    }

    const subtotal = Number(orderForm.subtotal || 0);
    const tax = Number(orderForm.tax || 0);
    const shipping = Number(orderForm.shipping || 0);
    const total = subtotal + tax + shipping;

    try {
      await fetchJSON(`${API}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customer_id: Number(orderForm.customer_id),
          subtotal,
          tax,
          shipping,
          total,
          payment_status: orderForm.payment_status,
          order_status: orderForm.order_status
        })
      });

      closeModal();
      showToast("Order created successfully.");
      loadData(false);
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleTransactionSubmit = async (event) => {
    event.preventDefault();

    if (
      !transactionForm.order_id ||
      !transactionForm.customer_id ||
      !transactionForm.amount
    ) {
      showToast(
        "Order, customer and amount are required.",
        "error"
      );
      return;
    }

    try {
      await fetchJSON(`${API}/api/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          order_id: Number(transactionForm.order_id),
          customer_id: Number(
            transactionForm.customer_id
          ),
          amount: Number(transactionForm.amount),
          payment_method:
            transactionForm.payment_method,
          status: transactionForm.status
        })
      });

      closeModal();
      showToast("Transaction recorded successfully.");
      loadData(false);
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleLogin = (event) => {
    event.preventDefault();

    if (
      loginForm.username === "admin" &&
      loginForm.password === "admin123"
    ) {
      setLoggedIn(true);
      setModal(null);
      setLoginForm({
        username: "",
        password: ""
      });

      showToast("Welcome back, Administrator.");
    } else {
      showToast(
        "Demo login: admin / admin123",
        "error"
      );
    }
  };

  const pageTitle = {
    dashboard: "Dashboard",
    products: "Product Catalog",
    inventory: "Inventory Intelligence",
    customers: "Customer Management",
    orders: "Order Management",
    transactions: "Transactions",
    analytics: "Commerce Analytics",
    system: "System Architecture"
  }[page];

  const pageSubtitle = {
    dashboard:
      "Real-time overview of your distributed commerce platform.",
    products:
      "Manage your MongoDB-backed product catalog.",
    inventory:
      "Monitor stock levels and identify products that need attention.",
    customers:
      "Manage customer records stored in MySQL.",
    orders:
      "Track orders and their complete lifecycle.",
    transactions:
      "Monitor payment and transaction activity.",
    analytics:
      "Business intelligence and commerce performance insights.",
    system:
      "Monitor the hybrid database architecture and platform health."
  }[page];

  const navigate = (target) => {
    setPage(target);
    setSearch("");
  };

  const statusClass = (value) => {
    const status = String(value || "")
      .toLowerCase()
      .replaceAll(" ", "-");

    return `status-badge ${status}`;
  };

  const renderDashboard = () => {
    const recentOrders = [...orders]
      .sort(
        (a, b) =>
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
      )
      .slice(0, 5);

    return (
      <>
        <section className="hero-card">
          <div>
            <div className="hero-eyebrow">
              DISTRIBUTED COMMERCE INTELLIGENCE
            </div>

            <h1>
              Commerce command center
              <span>.</span>
            </h1>

            <p>
              Monitor products, inventory, customers,
              orders and transactions from one unified
              platform.
            </p>

            <div className="hero-actions">
              <button
                className="primary-btn"
                onClick={() => openProductModal()}
              >
                + Add Product
              </button>

              <button
                className="secondary-btn"
                onClick={openOrderModal}
              >
                Create Order
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>
            <div className="hero-core">
              <span>DC</span>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon purple">
                ₹
              </div>

              <span className="trend positive">
                +12.8%
              </span>
            </div>

            <div className="stat-label">
              Total Revenue
            </div>

            <div className="stat-value">
              {currency(totalRevenue)}
            </div>

            <div className="stat-footer">
              From successful transactions
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon blue">
                🛒
              </div>

              <span className="trend positive">
                +8.4%
              </span>
            </div>

            <div className="stat-label">
              Total Orders
            </div>

            <div className="stat-value">
              {orders.length}
            </div>

            <div className="stat-footer">
              {pendingOrders.length} currently pending
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon green">
                ♙
              </div>

              <span className="trend positive">
                +5.2%
              </span>
            </div>

            <div className="stat-label">
              Customers
            </div>

            <div className="stat-value">
              {customers.length}
            </div>

            <div className="stat-footer">
              Registered customers
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon orange">
                ⚠
              </div>

              <span
                className={
                  lowStockProducts.length
                    ? "trend negative"
                    : "trend positive"
                }
              >
                {lowStockProducts.length
                  ? "Attention"
                  : "Healthy"}
              </span>
            </div>

            <div className="stat-label">
              Low Stock Items
            </div>

            <div className="stat-value">
              {lowStockProducts.length}
            </div>

            <div className="stat-footer">
              Threshold: 5 units
            </div>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="panel large-panel">
            <div className="panel-header">
              <div>
                <h2>Recent Orders</h2>
                <p>
                  Latest activity across your commerce
                  platform.
                </p>
              </div>

              <button
                className="text-btn"
                onClick={() => navigate("orders")}
              >
                View all →
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <EmptyState
                icon="🛒"
                title="No orders yet"
                description="Create your first order to see activity here."
              />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ORDER</th>
                      <th>CUSTOMER</th>
                      <th>TOTAL</th>
                      <th>PAYMENT</th>
                      <th>STATUS</th>
                      <th>DATE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>
                            #{order.id}
                          </strong>
                        </td>

                        <td>
                          Customer #{order.customer_id}
                        </td>

                        <td>
                          <strong>
                            {currency(order.total)}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={statusClass(
                              order.payment_status
                            )}
                          >
                            {order.payment_status}
                          </span>
                        </td>

                        <td>
                          <span
                            className={statusClass(
                              order.order_status
                            )}
                          >
                            {order.order_status}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            order.created_at
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>System Health</h2>
                <p>Live infrastructure status</p>
              </div>

              <div className="live-dot">
                <span></span>
                LIVE
              </div>
            </div>

            <div className="health-list">
              <HealthRow
                name="API Server"
                value={apiOnline}
                description="Express REST API"
              />

              <HealthRow
                name="MongoDB"
                value={mongoOnline}
                description="Products & inventory"
              />

              <HealthRow
                name="MySQL"
                value={mysqlOnline}
                description="Customers & transactions"
              />

              <HealthRow
                name="Auto Sync"
                value={true}
                description="10 second refresh"
              />
            </div>

            <div className="architecture-mini">
              <div className="arch-node">
                <span>CLIENT</span>
              </div>

              <div className="arch-line"></div>

              <div className="arch-node">
                <span>API</span>
              </div>

              <div className="arch-line"></div>

              <div className="arch-node split">
                <span>MONGO</span>
                <span>MYSQL</span>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-grid lower">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Inventory Alerts</h2>
                <p>Products requiring attention</p>
              </div>

              <button
                className="text-btn"
                onClick={() => navigate("inventory")}
              >
                Inventory →
              </button>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="success-box">
                <span>✓</span>
                <div>
                  <strong>Inventory looks healthy</strong>
                  <p>
                    No products are below the low-stock
                    threshold.
                  </p>
                </div>
              </div>
            ) : (
              <div className="alert-list">
                {lowStockProducts
                  .slice(0, 5)
                  .map((product) => (
                    <div
                      className="alert-item"
                      key={product._id}
                    >
                      <div className="product-avatar">
                        {String(product.name || "P")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="alert-info">
                        <strong>
                          {product.name}
                        </strong>
                        <span>
                          SKU: {product.sku}
                        </span>
                      </div>

                      <div className="stock-danger">
                        {product.stock || 0} left
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Revenue Overview</h2>
                <p>Transaction performance</p>
              </div>
            </div>

            <div className="revenue-number">
              {currency(totalRevenue)}
            </div>

            <div className="mini-chart">
              {[35, 50, 42, 68, 54, 76, 63, 88, 72, 94].map(
                (height, index) => (
                  <div
                    className="chart-bar"
                    style={{ height: `${height}%` }}
                    key={index}
                  ></div>
                )
              )}
            </div>

            <div className="chart-footer">
              <span>Pending: {currency(pendingRevenue)}</span>
              <span>
                {transactions.length} transactions
              </span>
            </div>
          </div>
        </section>
      </>
    );
  };

  const renderProducts = () => {
    return (
      <section className="panel page-panel">
        <div className="panel-header">
          <div>
            <h2>Product Catalog</h2>
            <p>
              Products are stored in MongoDB using
              flexible document structures.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={() => openProductModal()}
          >
            + Add Product
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon="◇"
            title="No products found"
            description="Add a product to build your catalog."
            buttonText="Add Product"
            onClick={() => openProductModal()}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>SKU</th>
                  <th>CATEGORY</th>
                  <th>PRICE</th>
                  <th>STOCK</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-avatar">
                          {String(product.name || "P")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {product.name}
                          </strong>
                          <span>
                            {product.description ||
                              "No description"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <code>{product.sku}</code>
                    </td>

                    <td>{product.category}</td>

                    <td>
                      <strong>
                        {currency(product.price)}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={
                          Number(product.stock || 0) <= 5
                            ? "stock low"
                            : "stock"
                        }
                      >
                        {product.stock || 0}
                      </span>
                    </td>

                    <td>
                      <span
                        className={statusClass(
                          product.status
                        )}
                      >
                        {product.status}
                      </span>
                    </td>

                    <td>
                      <div className="action-group">
                        <button
                          className="icon-btn"
                          title="Edit"
                          onClick={() =>
                            openProductModal(product)
                          }
                        >
                          ✎
                        </button>

                        <button
                          className="icon-btn danger"
                          title="Delete"
                          onClick={() =>
                            deleteProduct(product)
                          }
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const renderInventory = () => {
    return (
      <>
        <section className="inventory-summary">
          <div className="inventory-stat">
            <span className="inventory-stat-icon">▤</span>
            <div>
              <small>Total Products</small>
              <strong>{products.length}</strong>
            </div>
          </div>

          <div className="inventory-stat">
            <span className="inventory-stat-icon green">
              ✓
            </span>
            <div>
              <small>Healthy Stock</small>
              <strong>
                {
                  products.filter(
                    (product) =>
                      Number(product.stock || 0) > 5
                  ).length
                }
              </strong>
            </div>
          </div>

          <div className="inventory-stat">
            <span className="inventory-stat-icon orange">
              !
            </span>
            <div>
              <small>Low Stock</small>
              <strong>
                {lowStockProducts.length}
              </strong>
            </div>
          </div>

          <div className="inventory-stat">
            <span className="inventory-stat-icon red">
              0
            </span>
            <div>
              <small>Out of Stock</small>
              <strong>
                {
                  products.filter(
                    (product) =>
                      Number(product.stock || 0) === 0
                  ).length
                }
              </strong>
            </div>
          </div>
        </section>

        <section className="panel page-panel">
          <div className="panel-header">
            <div>
              <h2>Inventory Intelligence</h2>
              <p>
                Real-time stock visibility from the
                product catalog.
              </p>
            </div>

            <button
              className="secondary-btn"
              onClick={() => loadData(false)}
            >
              {refreshing ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {products.length === 0 ? (
            <EmptyState
              icon="▤"
              title="No inventory data"
              description="Products added to the catalog will automatically appear here."
            />
          ) : (
            <div className="inventory-grid">
              {products.map((product) => {
                const stock = Number(product.stock || 0);

                let level = "high";

                if (stock === 0) {
                  level = "empty";
                } else if (stock <= 5) {
                  level = "low";
                } else if (stock <= 20) {
                  level = "medium";
                }

                const width = Math.min(
                  Math.max(stock * 4, 4),
                  100
                );

                return (
                  <div
                    className="inventory-card"
                    key={product._id}
                  >
                    <div className="inventory-card-top">
                      <div className="product-avatar large">
                        {String(product.name || "P")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <span
                        className={`inventory-level ${level}`}
                      >
                        {level === "empty"
                          ? "OUT OF STOCK"
                          : level === "low"
                          ? "LOW STOCK"
                          : level === "medium"
                          ? "MEDIUM"
                          : "HEALTHY"}
                      </span>
                    </div>

                    <h3>{product.name}</h3>

                    <p>{product.category}</p>

                    <div className="stock-number">
                      {stock}
                      <span> units</span>
                    </div>

                    <div className="progress-track">
                      <div
                        className={`progress-bar ${level}`}
                        style={{
                          width: `${width}%`
                        }}
                      ></div>
                    </div>

                    <div className="inventory-card-footer">
                      <span>SKU</span>
                      <strong>{product.sku}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </>
    );
  };

  const renderCustomers = () => {
    return (
      <section className="panel page-panel">
        <div className="panel-header">
          <div>
            <h2>Customers</h2>
            <p>
              Customer records and relationship data
              stored in MySQL.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={openCustomerModal}
          >
            + Add Customer
          </button>
        </div>

        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon="♙"
            title="No customers found"
            description="Create your first customer record."
            buttonText="Add Customer"
            onClick={openCustomerModal}
          />
        ) : (
          <div className="customer-grid">
            {filteredCustomers.map((customer) => (
              <div
                className="customer-card"
                key={customer.id}
              >
                <div className="customer-card-top">
                  <div className="customer-avatar">
                    {String(customer.name || "C")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <span className="customer-status">
                    ACTIVE
                  </span>
                </div>

                <h3>{customer.name}</h3>

                <p>{customer.email}</p>

                <div className="customer-info">
                  <span>☎</span>
                  {customer.phone || "No phone"}
                </div>

                <div className="customer-info">
                  <span>⌂</span>
                  {customer.address || "No address"}
                </div>

                <div className="customer-card-footer">
                  <span>
                    Customer ID #{customer.id}
                  </span>

                  <button
                    className="text-btn"
                    onClick={() =>
                      navigate("orders")
                    }
                  >
                    Orders →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderOrders = () => {
    return (
      <section className="panel page-panel">
        <div className="panel-header">
          <div>
            <h2>Orders</h2>
            <p>
              Structured transactional order lifecycle
              managed through MySQL.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={openOrderModal}
          >
            + Create Order
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="No orders found"
            description="Create an order to start tracking the commerce lifecycle."
            buttonText="Create Order"
            onClick={openOrderModal}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ORDER</th>
                  <th>CUSTOMER</th>
                  <th>SUBTOTAL</th>
                  <th>TAX</th>
                  <th>SHIPPING</th>
                  <th>TOTAL</th>
                  <th>PAYMENT</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>
                        #{order.id}
                      </strong>
                    </td>

                    <td>
                      Customer #{order.customer_id}
                    </td>

                    <td>
                      {currency(order.subtotal)}
                    </td>

                    <td>
                      {currency(order.tax)}
                    </td>

                    <td>
                      {currency(order.shipping)}
                    </td>

                    <td>
                      <strong>
                        {currency(order.total)}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={statusClass(
                          order.payment_status
                        )}
                      >
                        {order.payment_status}
                      </span>
                    </td>

                    <td>
                      <span
                        className={statusClass(
                          order.order_status
                        )}
                      >
                        {order.order_status}
                      </span>
                    </td>

                    <td>
                      {formatDateTime(
                        order.created_at
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const renderTransactions = () => {
    return (
      <section className="panel page-panel">
        <div className="panel-header">
          <div>
            <h2>Transactions</h2>
            <p>
              Payment and transaction activity linked to
              orders.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={openTransactionModal}
          >
            + Record Transaction
          </button>
        </div>

        <div className="transaction-summary">
          <div>
            <small>Successful</small>
            <strong>
              {
                transactions.filter(
                  (t) => t.status === "successful"
                ).length
              }
            </strong>
          </div>

          <div>
            <small>Pending</small>
            <strong>
              {
                transactions.filter(
                  (t) => t.status === "pending"
                ).length
              }
            </strong>
          </div>

          <div>
            <small>Failed</small>
            <strong>
              {
                transactions.filter(
                  (t) => t.status === "failed"
                ).length
              }
            </strong>
          </div>

          <div>
            <small>Total Value</small>
            <strong>
              {currency(
                transactions.reduce(
                  (sum, t) =>
                    sum + Number(t.amount || 0),
                  0
                )
              )}
            </strong>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon="₹"
            title="No transactions"
            description="Payment activity will appear here."
            buttonText="Record Transaction"
            onClick={openTransactionModal}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TRANSACTION</th>
                  <th>ORDER</th>
                  <th>CUSTOMER</th>
                  <th>AMOUNT</th>
                  <th>METHOD</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.map(
                  (transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        <strong>
                          TXN-{transaction.id}
                        </strong>
                      </td>

                      <td>
                        #{transaction.order_id}
                      </td>

                      <td>
                        #{transaction.customer_id}
                      </td>

                      <td>
                        <strong>
                          {currency(
                            transaction.amount
                          )}
                        </strong>
                      </td>

                      <td>
                        <span className="payment-method">
                          {transaction.payment_method ||
                            "N/A"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            transaction.status
                          )}
                        >
                          {transaction.status}
                        </span>
                      </td>

                      <td>
                        {formatDateTime(
                          transaction.created_at
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const renderAnalytics = () => {
    const successfulTransactions =
      transactions.filter(
        (t) => t.status === "successful"
      );

    const paymentMethods = {};

    transactions.forEach((transaction) => {
      const method =
        transaction.payment_method || "Unknown";

      paymentMethods[method] =
        (paymentMethods[method] || 0) + 1;
    });

    const maxPaymentMethod = Math.max(
      ...Object.values(paymentMethods),
      1
    );

    return (
      <>
        <section className="analytics-grid">
          <div className="analytics-card">
            <span>Revenue</span>
            <strong>{currency(totalRevenue)}</strong>
            <small>
              Successful payment transactions
            </small>
          </div>

          <div className="analytics-card">
            <span>Average Order</span>
            <strong>
              {orders.length
                ? currency(
                    orders.reduce(
                      (sum, order) =>
                        sum +
                        Number(order.total || 0),
                      0
                    ) / orders.length
                  )
                : currency(0)}
            </strong>
            <small>Across all recorded orders</small>
          </div>

          <div className="analytics-card">
            <span>Conversion Health</span>
            <strong>
              {transactions.length
                ? Math.round(
                    (successfulTransactions.length /
                      transactions.length) *
                      100
                  )
                : 0}
              %
            </strong>
            <small>Successful transaction ratio</small>
          </div>
        </section>

        <section className="analytics-layout">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Revenue Trend</h2>
                <p>
                  Visual representation of platform
                  revenue activity.
                </p>
              </div>
            </div>

            <div className="big-chart">
              {[42, 48, 44, 60, 52, 67, 58, 74, 69, 88, 78, 94].map(
                (height, index) => (
                  <div
                    className="big-chart-column"
                    key={index}
                  >
                    <div
                      className="big-chart-value"
                      style={{
                        height: `${height}%`
                      }}
                    ></div>

                    <span>
                      {index + 1}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Payment Methods</h2>
                <p>Transaction distribution</p>
              </div>
            </div>

            <div className="method-list">
              {Object.keys(paymentMethods).length ===
              0 ? (
                <EmptyState
                  icon="₹"
                  title="No payment data"
                  description="Payment methods will appear after transactions are recorded."
                />
              ) : (
                Object.entries(paymentMethods).map(
                  ([method, count]) => (
                    <div
                      className="method-row"
                      key={method}
                    >
                      <div className="method-name">
                        <span className="method-dot"></span>
                        {method}
                      </div>

                      <div className="method-bar">
                        <div
                          style={{
                            width: `${
                              (count /
                                maxPaymentMethod) *
                              100
                            }%`
                          }}
                        ></div>
                      </div>

                      <strong>{count}</strong>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </section>

        <section className="panel insight-panel">
          <div className="insight-icon">✦</div>

          <div>
            <h2>Inventory Intelligence Ready</h2>
            <p>
              Your architecture is structured for future
              forecasting, reorder recommendations and
              analytics workloads. The current dashboard
              uses live product stock and transaction
              records to surface operational insights.
            </p>
          </div>
        </section>
      </>
    );
  };

  const renderSystem = () => {
    return (
      <>
        <section className="system-hero">
          <div>
            <div className="hero-eyebrow">
              PLATFORM ARCHITECTURE
            </div>

            <h2>
              Distributed Digital Commerce &
              Inventory Intelligence
            </h2>

            <p>
              A modular commerce platform separating
              product, inventory, customer, order,
              processing and intelligence workloads.
            </p>
          </div>

          <div className="system-status">
            <span
              className={
                apiOnline
                  ? "status-light online"
                  : "status-light offline"
              }
            ></span>

            {apiOnline
              ? "All systems operational"
              : "Backend offline"}
          </div>
        </section>

        <section className="architecture-flow">
          <ArchitectureNode
            title="Clients"
            description="Admin / Web"
            icon="▣"
          />

          <ArchitectureArrow />

          <ArchitectureNode
            title="REST API"
            description="Express"
            icon="⇄"
          />

          <ArchitectureArrow />

          <ArchitectureNode
            title="Services"
            description="Catalog / Orders"
            icon="◇"
          />

          <ArchitectureArrow />

          <ArchitectureNode
            title="Databases"
            description="MongoDB + MySQL"
            icon="▤"
          />
        </section>

        <section className="system-grid">
          <SystemCard
            title="MongoDB"
            status={mongoOnline}
            description="Flexible document storage for product catalog and inventory records."
            items={[
              "Product documents",
              "Flexible attributes",
              "Inventory visibility",
              "Catalog workloads"
            ]}
          />

          <SystemCard
            title="MySQL"
            status={mysqlOnline}
            description="Structured transactional storage for customers, orders and transactions."
            items={[
              "Customer records",
              "Order lifecycle",
              "Transactions",
              "Relational integrity"
            ]}
          />

          <SystemCard
            title="REST API"
            status={apiOnline}
            description="Central service boundary connecting the frontend to distributed backend modules."
            items={[
              "Product API",
              "Customer API",
              "Order API",
              "Transaction API"
            ]}
          />
        </section>
      </>
    );
  };

  const renderPage = () => {
    switch (page) {
      case "products":
        return renderProducts();

      case "inventory":
        return renderInventory();

      case "customers":
        return renderCustomers();

      case "orders":
        return renderOrders();

      case "transactions":
        return renderTransactions();

      case "analytics":
        return renderAnalytics();

      case "system":
        return renderSystem();

      default:
        return renderDashboard();
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">DC</div>

          <div>
            <strong>CommerceIQ</strong>
            <span>Digital Commerce</span>
          </div>
        </div>

        <div className="sidebar-section-title">
          MAIN MENU
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={
                page === item.id
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => navigate(item.id)}
            >
              <span className="nav-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>

              {item.id === "inventory" &&
                lowStockProducts.length > 0 && (
                  <span className="nav-count">
                    {lowStockProducts.length}
                  </span>
                )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-mini-status">
            <div className="system-mini-header">
              <span
                className={
                  apiOnline
                    ? "pulse-dot"
                    : "pulse-dot offline"
                }
              ></span>

              <strong>
                {apiOnline
                  ? "System Online"
                  : "System Offline"}
              </strong>
            </div>

            <span>
              MongoDB + MySQL
            </span>
          </div>

          <button
            className="sidebar-user"
            onClick={() => setModal("login")}
          >
            <div className="user-avatar">
              {loggedIn ? "A" : "G"}
            </div>

            <div className="user-info">
              <strong>
                {loggedIn
                  ? "Administrator"
                  : "Guest Admin"}
              </strong>

              <span>
                {loggedIn
                  ? "Administrator"
                  : "Sign in"}
              </span>
            </div>

            <span className="user-arrow">›</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>CommerceIQ</span>
            <b>/</b>
            <strong>{pageTitle}</strong>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <span>⌕</span>

              <input
                type="text"
                placeholder="Search products, orders, customers..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              {search && (
                <button
                  onClick={() => setSearch("")}
                >
                  ×
                </button>
              )}
            </div>

            <button
              className="top-icon-btn"
              onClick={() => loadData(false)}
              title="Refresh"
            >
              {refreshing ? "…" : "↻"}
            </button>

            <button
              className="top-icon-btn notification"
              title="Notifications"
              onClick={() =>
                showToast(
                  lowStockProducts.length
                    ? `${lowStockProducts.length} inventory item(s) need attention.`
                    : "No new notifications."
                )
              }
            >
              ♢

              {lowStockProducts.length > 0 && (
                <span></span>
              )}
            </button>

            <button
              className="top-user"
              onClick={() => setModal("login")}
            >
              <div className="user-avatar">
                {loggedIn ? "A" : "G"}
              </div>

              <div>
                <strong>
                  {loggedIn
                    ? "Administrator"
                    : "Guest Admin"}
                </strong>

                <span>Admin</span>
              </div>

              <span>⌄</span>
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <h1>{pageTitle}</h1>
              <p>{pageSubtitle}</p>
            </div>

            <div className="heading-actions">
              <div className="connection-pill">
                <span
                  className={
                    apiOnline
                      ? "pulse-dot"
                      : "pulse-dot offline"
                  }
                ></span>

                {apiOnline
                  ? "Live connection"
                  : "Offline"}
              </div>
            </div>
          </div>

          {renderPage()}
        </div>
      </main>

      {modal === "product" && (
        <Modal
          title={
            editingProduct
              ? "Edit Product"
              : "Add New Product"
          }
          subtitle="Product information is stored in MongoDB."
          onClose={closeModal}
        >
          <form
            className="modal-form"
            onSubmit={handleProductSubmit}
          >
            <div className="form-grid">
              <FormInput
                label="Product Name *"
                value={productForm.name}
                onChange={(value) =>
                  setProductForm({
                    ...productForm,
                    name: value
                  })
                }
                placeholder="e.g. Wireless Headphones"
              />

              <FormInput
                label="SKU *"
                value={productForm.sku}
                onChange={(value) =>
                  setProductForm({
                    ...productForm,
                    sku: value
                  })
                }
                placeholder="e.g. WH-1001"
              />

              <FormInput
                label="Price *"
                type="number"
                value={productForm.price}
                onChange={(value) =>
                  setProductForm({
                    ...productForm,
                    price: value
                  })
                }
                placeholder="2499"
              />

              <FormInput
                label="Stock"
                type="number"
                value={productForm.stock}
                onChange={(value) =>
                  setProductForm({
                    ...productForm,
                    stock: value
                  })
                }
                placeholder="50"
              />

              <FormSelect
                label="Category"
                value={productForm.category}
                onChange={(value) =>
                  setProductForm({
                    ...productForm,
                    category: value
                  })
                }
                options={[
                  "Electronics",
                  "Fashion",
                  "Home",
                  "Beauty",
                  "Grocery",
                  "Sports",
                  "Other"
                ]}
              />

              <FormSelect
                label="Status"
                value={productForm.status}
                onChange={(value) =>
                  setProductForm({
                    ...productForm,
                    status: value
                  })
                }
                options={[
                  "active",
                  "inactive"
                ]}
              />
            </div>

            <FormInput
              label="Description"
              value={productForm.description}
              onChange={(value) =>
                setProductForm({
                  ...productForm,
                  description: value
                })
              }
              placeholder="Short product description"
            />

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-btn"
              >
                {editingProduct
                  ? "Update Product"
                  : "Add Product"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "customer" && (
        <Modal
          title="Add Customer"
          subtitle="Customer data is stored in MySQL."
          onClose={closeModal}
        >
          <form
            className="modal-form"
            onSubmit={handleCustomerSubmit}
          >
            <FormInput
              label="Full Name *"
              value={customerForm.name}
              onChange={(value) =>
                setCustomerForm({
                  ...customerForm,
                  name: value
                })
              }
              placeholder="Rahul Sharma"
            />

            <FormInput
              label="Email *"
              type="email"
              value={customerForm.email}
              onChange={(value) =>
                setCustomerForm({
                  ...customerForm,
                  email: value
                })
              }
              placeholder="rahul@example.com"
            />

            <FormInput
              label="Phone"
              value={customerForm.phone}
              onChange={(value) =>
                setCustomerForm({
                  ...customerForm,
                  phone: value
                })
              }
              placeholder="9876543210"
            />

            <FormInput
              label="Address"
              value={customerForm.address}
              onChange={(value) =>
                setCustomerForm({
                  ...customerForm,
                  address: value
                })
              }
              placeholder="Hyderabad"
            />

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-btn"
              >
                Create Customer
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "order" && (
        <Modal
          title="Create Order"
          subtitle="Create a structured order in MySQL."
          onClose={closeModal}
        >
          {customers.length === 0 ? (
            <div className="modal-empty">
              <div>♙</div>
              <h3>No customers available</h3>
              <p>
                Add a customer before creating an
                order.
              </p>

              <button
                className="primary-btn"
                onClick={() => {
                  setModal("customer");
                }}
              >
                Add Customer
              </button>
            </div>
          ) : (
            <form
              className="modal-form"
              onSubmit={handleOrderSubmit}
            >
              <FormSelect
                label="Customer *"
                value={String(
                  orderForm.customer_id
                )}
                onChange={(value) =>
                  setOrderForm({
                    ...orderForm,
                    customer_id: value
                  })
                }
                options={customers.map(
                  (customer) =>
                    `${customer.id} - ${customer.name}`
                )}
                rawValues={customers.map(
                  (customer) =>
                    String(customer.id)
                )}
              />

              <div className="form-grid">
                <FormInput
                  label="Subtotal"
                  type="number"
                  value={orderForm.subtotal}
                  onChange={(value) =>
                    setOrderForm({
                      ...orderForm,
                      subtotal: value
                    })
                  }
                  placeholder="2000"
                />

                <FormInput
                  label="Tax"
                  type="number"
                  value={orderForm.tax}
                  onChange={(value) =>
                    setOrderForm({
                      ...orderForm,
                      tax: value
                    })
                  }
                  placeholder="360"
                />

                <FormInput
                  label="Shipping"
                  type="number"
                  value={orderForm.shipping}
                  onChange={(value) =>
                    setOrderForm({
                      ...orderForm,
                      shipping: value
                    })
                  }
                  placeholder="139"
                />

                <div className="calculated-total">
                  <span>Total</span>
                  <strong>
                    {currency(
                      Number(
                        orderForm.subtotal || 0
                      ) +
                        Number(orderForm.tax || 0) +
                        Number(
                          orderForm.shipping || 0
                        )
                    )}
                  </strong>
                </div>
              </div>

              <div className="form-grid">
                <FormSelect
                  label="Payment Status"
                  value={orderForm.payment_status}
                  onChange={(value) =>
                    setOrderForm({
                      ...orderForm,
                      payment_status: value
                    })
                  }
                  options={[
                    "pending",
                    "paid",
                    "failed"
                  ]}
                />

                <FormSelect
                  label="Order Status"
                  value={orderForm.order_status}
                  onChange={(value) =>
                    setOrderForm({
                      ...orderForm,
                      order_status: value
                    })
                  }
                  options={[
                    "pending",
                    "processing",
                    "shipped",
                    "delivered",
                    "cancelled"
                  ]}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  Create Order
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {modal === "transaction" && (
        <Modal
          title="Record Transaction"
          subtitle="Record payment activity in MySQL."
          onClose={closeModal}
        >
          {orders.length === 0 ? (
            <div className="modal-empty">
              <div>₹</div>
              <h3>No orders available</h3>
              <p>
                Create an order before recording a
                transaction.
              </p>

              <button
                className="primary-btn"
                onClick={() => {
                  setModal("order");
                }}
              >
                Create Order
              </button>
            </div>
          ) : (
            <form
              className="modal-form"
              onSubmit={handleTransactionSubmit}
            >
              <div className="form-grid">
                <FormSelect
                  label="Order"
                  value={String(
                    transactionForm.order_id
                  )}
                  onChange={(value) => {
                    const selectedOrder =
                      orders.find(
                        (order) =>
                          String(order.id) === value
                      );

                    setTransactionForm({
                      ...transactionForm,
                      order_id: value,
                      customer_id:
                        selectedOrder?.customer_id ||
                        transactionForm.customer_id,
                      amount:
                        selectedOrder?.total ||
                        transactionForm.amount
                    });
                  }}
                  options={orders.map(
                    (order) =>
                      `#${order.id} - ${currency(
                        order.total
                      )}`
                  )}
                  rawValues={orders.map((order) =>
                    String(order.id)
                  )}
                />

                <FormInput
                  label="Customer ID"
                  type="number"
                  value={transactionForm.customer_id}
                  onChange={(value) =>
                    setTransactionForm({
                      ...transactionForm,
                      customer_id: value
                    })
                  }
                  placeholder="1"
                />

                <FormInput
                  label="Amount"
                  type="number"
                  value={transactionForm.amount}
                  onChange={(value) =>
                    setTransactionForm({
                      ...transactionForm,
                      amount: value
                    })
                  }
                  placeholder="2499"
                />

                <FormSelect
                  label="Payment Method"
                  value={
                    transactionForm.payment_method
                  }
                  onChange={(value) =>
                    setTransactionForm({
                      ...transactionForm,
                      payment_method: value
                    })
                  }
                  options={[
                    "UPI",
                    "Card",
                    "Cash",
                    "Net Banking",
                    "Wallet"
                  ]}
                />

                <FormSelect
                  label="Status"
                  value={transactionForm.status}
                  onChange={(value) =>
                    setTransactionForm({
                      ...transactionForm,
                      status: value
                    })
                  }
                  options={[
                    "successful",
                    "pending",
                    "failed",
                    "refunded"
                  ]}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  Record Transaction
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {modal === "login" && (
        <Modal
          title="Administrator Access"
          subtitle="Sign in to access administrative controls."
          onClose={closeModal}
        >
          <form
            className="login-form"
            onSubmit={handleLogin}
          >
            <div className="login-logo">DC</div>

            <h3>Welcome back</h3>

            <p>
              Use the demo administrator account for
              this project interface.
            </p>

            <FormInput
              label="Username"
              value={loginForm.username}
              onChange={(value) =>
                setLoginForm({
                  ...loginForm,
                  username: value
                })
              }
              placeholder="admin"
            />

            <FormInput
              label="Password"
              type="password"
              value={loginForm.password}
              onChange={(value) =>
                setLoginForm({
                  ...loginForm,
                  password: value
                })
              }
              placeholder="admin123"
            />

            <div className="demo-credentials">
              <strong>Demo credentials</strong>
              <span>admin / admin123</span>
            </div>

            <button
              type="submit"
              className="primary-btn full"
            >
              Sign In
            </button>
          </form>
        </Modal>
      )}

      {toast && (
        <div
          className={`toast ${
            toast.type === "error"
              ? "toast-error"
              : ""
          }`}
        >
          <span>
            {toast.type === "error" ? "!" : "✓"}
          </span>

          {toast.message}
        </div>
      )}
    </div>
  );
}

function HealthRow({
  name,
  value,
  description
}) {
  return (
    <div className="health-row">
      <div className="health-left">
        <span
          className={
            value
              ? "health-indicator"
              : "health-indicator offline"
          }
        ></span>

        <div>
          <strong>{name}</strong>
          <span>{description}</span>
        </div>
      </div>

      <span
        className={
          value
            ? "health-status"
            : "health-status offline"
        }
      >
        {value ? "Operational" : "Offline"}
      </span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  buttonText,
  onClick
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{description}</p>

      {buttonText && onClick && (
        <button
          className="primary-btn"
          onClick={onClick}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner"></div>
      <span>Loading platform data...</span>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children
}) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}) {
  return (
    <label className="form-field">
      <span>{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
      />
    </label>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  rawValues
}) {
  return (
    <label className="form-field">
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map((option, index) => (
          <option
            key={`${option}-${index}`}
            value={
              rawValues
                ? rawValues[index]
                : option
            }
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ArchitectureNode({
  title,
  description,
  icon
}) {
  return (
    <div className="architecture-node">
      <div className="architecture-icon">
        {icon}
      </div>

      <strong>{title}</strong>

      <span>{description}</span>
    </div>
  );
}

function ArchitectureArrow() {
  return (
    <div className="architecture-arrow">
      →
    </div>
  );
}

function SystemCard({
  title,
  status,
  description,
  items
}) {
  return (
    <div className="system-card">
      <div className="system-card-top">
        <div className="system-card-icon">
          {title === "MongoDB"
            ? "M"
            : title === "MySQL"
            ? "SQL"
            : "API"}
        </div>

        <span
          className={
            status
              ? "system-online"
              : "system-offline"
          }
        >
          <span></span>

          {status ? "Connected" : "Offline"}
        </span>
      </div>

      <h3>{title}</h3>

      <p>{description}</p>

      <div className="system-card-list">
        {items.map((item) => (
          <div key={item}>
            <span>✓</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}


export default App;
