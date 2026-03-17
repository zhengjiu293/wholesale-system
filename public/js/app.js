// API基础URL
const API_BASE = '/api';

// 当前登录用户
let currentCustomer = null;

// 购物车数据
let cart = [];

// 商品数据
let products = [];

// 分类数据
let categories = [];

// 页面初始化
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
});

// 检查登录状态
function checkLoginStatus() {
    const customerData = localStorage.getItem('customer');
    if (customerData) {
        currentCustomer = JSON.parse(customerData);
        showProducts();
    } else {
        showLogin();
    }
}

// 显示登录页面
function showLogin() {
    hideAllPages();
    document.getElementById('loginPage').style.display = 'block';
}

// 显示注册页面
function showRegister() {
    hideAllPages();
    document.getElementById('registerPage').style.display = 'block';
}

// 显示商品列表页面
function showProducts() {
    hideAllPages();
    document.getElementById('productPage').style.display = 'block';
    loadProducts();
    loadCategories();
}

// 隐藏所有页面
function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
}

// 客户登录
async function customerLogin() {
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!phone || !password) {
        showToast('请输入手机号和密码');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/customers/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentCustomer = data.customer;
            localStorage.setItem('customer', JSON.stringify(currentCustomer));
            showToast('登录成功');
            showProducts();
        } else {
            showToast(data.error || '登录失败');
        }
    } catch (error) {
        showToast('网络错误，请稍后重试');
    }
}

// 客户注册
async function customerRegister() {
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const address = document.getElementById('regAddress').value.trim();
    
    if (!name || !phone || !password || !address) {
        showToast('请填写所有字段');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/customers/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, password, address })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('注册成功，请登录');
            showLogin();
        } else {
            showToast(data.error || '注册失败');
        }
    } catch (error) {
        showToast('网络错误，请稍后重试');
    }
}

// 客户退出
function customerLogout() {
    localStorage.removeItem('customer');
    currentCustomer = null;
    cart = [];
    showLogin();
    showToast('已退出登录');
}

// 加载商品列表
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();
        products = data.products || [];
        renderProducts(products);
    } catch (error) {
        showToast('加载商品失败');
    }
}

// 加载分类
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        const data = await response.json();
        categories = data.categories || [];
        renderCategories();
    } catch (error) {
        console.error('加载分类失败');
    }
}

// 渲染分类
function renderCategories() {
    const categoryBar = document.getElementById('categoryBar');
    let html = `<div class="category-item active" onclick="filterByCategory(null)">全部</div>`;
    
    categories.forEach(cat => {
        html += `<div class="category-item" onclick="filterByCategory(${cat.id})">${cat.name}</div>`;
    });
    
    categoryBar.innerHTML = html;
}

// 按分类筛选
function filterByCategory(categoryId) {
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (categoryId === null) {
        renderProducts(products);
    } else {
        const filtered = products.filter(p => p.category_id === categoryId);
        renderProducts(filtered);
    }
}

// 搜索商品
function searchProducts() {
    const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (!keyword) {
        renderProducts(products);
        return;
    }
    
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword)
    );
    
    renderProducts(filtered);
}

// 渲染商品列表
function renderProducts(productList) {
    const productListEl = document.getElementById('productList');
    
    if (productList.length === 0) {
        productListEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <p>暂无商品</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    productList.forEach(product => {
        const cartItem = cart.find(c => c.product_id === product.id);
        const quantity = cartItem ? cartItem.quantity : 0;
        
        html += `
            <div class="product-card">
                <div class="product-image">📦</div>
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">¥${product.price.toFixed(2)}</div>
                    <div class="product-stock">库存: ${product.stock}</div>
                    <div class="product-actions">
                        <div class="quantity-control">
                            <button class="quantity-btn" onclick="decreaseQuantity(${product.id}, ${quantity})">-</button>
                            <span class="quantity-num" id="qty-${product.id}">${quantity}</span>
                            <button class="quantity-btn" onclick="increaseQuantity(${product.id}, ${product.stock})">+</button>
                        </div>
                        <button class="add-btn" onclick="addToCart(${product.id})">加入</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    productListEl.innerHTML = html;
}

// 增加数量
function increaseQuantity(productId, maxStock) {
    const qtyEl = document.getElementById(`qty-${productId}`);
    let quantity = parseInt(qtyEl.textContent);
    if (quantity < maxStock) {
        quantity++;
        qtyEl.textContent = quantity;
        updateCartQuantity(productId, quantity);
    }
}

// 减少数量
function decreaseQuantity(productId, currentQuantity) {
    if (currentQuantity > 0) {
        const qtyEl = document.getElementById(`qty-${productId}`);
        let quantity = parseInt(qtyEl.textContent);
        if (quantity > 0) {
            quantity--;
            qtyEl.textContent = quantity;
            updateCartQuantity(productId, quantity);
        }
    }
}

// 更新购物车数量
function updateCartQuantity(productId, quantity) {
    const existingItem = cart.find(item => item.product_id === productId);
    
    if (quantity === 0) {
        cart = cart.filter(item => item.product_id !== productId);
    } else if (existingItem) {
        existingItem.quantity = quantity;
    }
    
    updateCartCount();
}

// 加入购物车
function addToCart(productId) {
    const qtyEl = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(qtyEl.textContent);
    
    if (quantity === 0) {
        showToast('请先选择数量');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.product_id === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            product_id: productId,
            name: product.name,
            price: product.price,
            quantity: quantity
        });
    }
    
    showToast('已加入购物车');
    updateCartCount();
    
    // 重置数量显示
    qtyEl.textContent = '0';
}

// 更新购物车数量显示
function updateCartCount() {
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = total;
}

// 显示购物车
function showCart() {
    hideAllPages();
    document.getElementById('cartPage').style.display = 'block';
    renderCart();
}

// 隐藏购物车
function hideCart() {
    showProducts();
}

// 渲染购物车
function renderCart() {
    const cartListEl = document.getElementById('cartList');
    const cartFooterEl = document.getElementById('cartFooter');
    
    if (cart.length === 0) {
        cartListEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🛒</div>
                <p>购物车是空的</p>
            </div>
        `;
        cartFooterEl.style.display = 'none';
        return;
    }
    
    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        
        html += `
            <div class="cart-item">
                <div class="cart-item-header">
                    <span class="cart-item-name">${item.name}</span>
                    <span class="cart-item-price">¥${subtotal.toFixed(2)}</span>
                </div>
                <div class="cart-item-bottom">
                    <span class="cart-item-remove" onclick="removeFromCart(${item.product_id})">删除</span>
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="updateCartItemQuantity(${item.product_id}, ${item.quantity - 1})">-</button>
                        <span class="quantity-num">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartItemQuantity(${item.product_id}, ${item.quantity + 1})">+</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    cartListEl.innerHTML = html;
    document.getElementById('cartTotal').textContent = `¥${total.toFixed(2)}`;
    cartFooterEl.style.display = 'flex';
}

// 更新购物车商品数量
function updateCartItemQuantity(productId, quantity) {
    if (quantity <= 0) {
        removeFromCart(productId);
    } else {
        const item = cart.find(c => c.product_id === productId);
        if (item) {
            item.quantity = quantity;
            renderCart();
            updateCartCount();
        }
    }
}

// 从购物车移除
function removeFromCart(productId) {
    cart = cart.filter(item => item.product_id !== productId);
    renderCart();
    updateCartCount();
}

// 清空购物车
function clearCart() {
    if (confirm('确定要清空购物车吗？')) {
        cart = [];
        renderCart();
        updateCartCount();
        showToast('购物车已清空');
    }
}

// 显示结算页面
function showCheckout() {
    if (cart.length === 0) {
        showToast('购物车是空的');
        return;
    }
    
    hideAllPages();
    document.getElementById('checkoutPage').style.display = 'block';
    
    // 填充默认地址
    document.getElementById('checkoutAddress').value = currentCustomer.address || '';
    
    renderOrderSummary();
}

// 隐藏结算页面
function hideCheckout() {
    showCart();
}

// 渲染订单摘要
function renderOrderSummary() {
    const summaryEl = document.getElementById('orderSummary');
    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        
        html += `
            <div class="order-item">
                <span>${item.name} x ${item.quantity}</span>
                <span>¥${subtotal.toFixed(2)}</span>
            </div>
        `;
    });
    
    summaryEl.innerHTML = html;
    document.getElementById('orderTotal').textContent = `¥${total.toFixed(2)}`;
}

// 提交订单
async function submitOrder() {
    const address = document.getElementById('checkoutAddress').value.trim();
    const note = document.getElementById('checkoutNote').value.trim();
    const paymentMethod = document.getElementById('checkoutPayment').value;
    
    if (!address) {
        showToast('请输入收货地址');
        return;
    }
    
    if (cart.length === 0) {
        showToast('购物车是空的');
        return;
    }
    
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    try {
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_id: currentCustomer.id,
                items: cart,
                total_amount: totalAmount,
                address: address,
                note: note,
                payment_method: paymentMethod
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('订单提交成功');
            cart = [];
            updateCartCount();
            showProducts();
        } else {
            showToast(data.error || '订单提交失败');
        }
    } catch (error) {
        showToast('网络错误，请稍后重试');
    }
}

// 显示订单列表
function showOrders() {
    hideAllPages();
    document.getElementById('orderListPage').style.display = 'block';
    loadOrders();
}

// 加载订单列表
async function loadOrders() {
    if (!currentCustomer) return;
    
    try {
        const response = await fetch(`${API_BASE}/orders/customer/${currentCustomer.id}`);
        const data = await response.json();
        renderOrders(data.orders || []);
    } catch (error) {
        showToast('加载订单失败');
    }
}

// 渲染订单列表
function renderOrders(orders) {
    const orderListEl = document.getElementById('orderList');
    
    if (orders.length === 0) {
        orderListEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>暂无订单</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    orders.forEach(order => {
        const statusClass = getStatusClass(order.status);
        const statusText = getStatusText(order.status);
        
        html += `
            <div class="order-card" onclick="showOrderDetail(${order.id})">
                <div class="order-header">
                    <span class="order-id">订单号: ${order.id}</span>
                    <span class="order-status ${statusClass}">${statusText}</span>
                </div>
                <div class="order-info">
                    <div>下单时间: ${new Date(order.created_at).toLocaleString()}</div>
                    <div>支付方式: ${order.payment_method === 'online' ? '在线支付' : '货到付款'}</div>
                </div>
                <div class="order-items">
                    ${JSON.parse(order.items).map(item => `
                        <div class="order-product">
                            <span>${item.name}</span>
                            <span>x${item.quantity}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">
                    <span>总计:</span>
                    <span>¥${parseFloat(order.total_amount).toFixed(2)}</span>
                </div>
            </div>
        `;
    });
    
    orderListEl.innerHTML = html;
}

// 获取状态样式类
function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',
        'paid': 'status-paid',
        'shipped': 'status-shipped',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
    };
    return statusMap[status] || 'status-pending';
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '待支付',
        'paid': '已支付',
        'shipped': '已发货',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || '待支付';
}

// 显示订单详情
async function showOrderDetail(orderId) {
    try {
        const response = await fetch(`${API_BASE}/orders/${orderId}`);
        const data = await response.json();
        
        if (response.ok) {
            const order = data.order;
            const items = JSON.parse(order.items);
            
            let html = `
                <div style="margin-bottom: 20px;">
                    <strong>订单号:</strong> ${order.id}<br>
                    <strong>下单时间:</strong> ${new Date(order.created_at).toLocaleString()}<br>
                    <strong>收货地址:</strong> ${order.address}<br>
                    <strong>支付方式:</strong> ${order.payment_method === 'online' ? '在线支付' : '货到付款'}<br>
                    <strong>订单状态:</strong> ${getStatusText(order.status)}
                </div>
                <h4 style="margin-bottom: 10px;">商品明细:</h4>
            `;
            
            items.forEach(item => {
                html += `
                    <div style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                        <div>${item.name}</div>
                        <div style="color: #666; font-size: 14px;">
                            单价: ¥${item.price.toFixed(2)} x ${item.quantity} = ¥${(item.price * item.quantity).toFixed(2)}
                        </div>
                    </div>
                `;
            });
            
            html += `
                <div style="margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold;">
                    总计: ¥${parseFloat(order.total_amount).toFixed(2)}
                </div>
            `;
            
            document.getElementById('orderDetailContent').innerHTML = html;
            document.getElementById('orderDetailModal').style.display = 'flex';
        }
    } catch (error) {
        showToast('加载订单详情失败');
    }
}

// 关闭订单详情
function closeOrderDetail() {
    document.getElementById('orderDetailModal').style.display = 'none';
}

// 显示提示消息
function showToast(message) {
    // 移除已存在的toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 2000);
}
