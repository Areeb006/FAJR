// Admin Dashboard JavaScript

// Global variables
let currentProductId = null;
let currentUserId = null;
let currentOrderId = null;

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin dashboard initializing...');
    initializeAdmin();
    
    // Direct hamburger fix
    setTimeout(function() {
        const hamburger = document.getElementById('mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        console.log('Hamburger element:', hamburger);
        console.log('Sidebar element:', sidebar);
        
        if (hamburger && sidebar) {
            console.log('Setting up hamburger menu...');
            
            hamburger.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Hamburger clicked!');
                
                if (sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    console.log('Sidebar closed');
                } else {
                    sidebar.classList.add('open');
                    console.log('Sidebar opened');
                }
            });
            
            // Also add click outside to close
            document.addEventListener('click', function(e) {
                if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            });
            
        } else {
            console.error('Hamburger or sidebar not found!');
        }
    }, 100);
});

// Enhanced mobile sidebar functionality
function setupMobileSidebar() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    console.log('Setting up mobile sidebar...');
    console.log('Mobile menu toggle:', mobileMenuToggle);
    console.log('Sidebar:', sidebar);
    
    if (!mobileMenuToggle || !sidebar) {
        console.error('Mobile menu toggle or sidebar not found!');
        return;
    }
    
    // Create overlay if it doesn't exist
    if (!overlay) {
        const newOverlay = document.createElement('div');
        newOverlay.className = 'sidebar-overlay';
        document.body.appendChild(newOverlay);
        overlay = newOverlay;
    }
    
    // Show/hide sidebar
    function showSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent body scroll
    }
    
    function hideSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore body scroll
    }
    
    // Toggle sidebar on hamburger click
    mobileMenuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Hamburger clicked!');
        
        if (sidebar.classList.contains('open')) {
            console.log('Hiding sidebar');
            hideSidebar();
        } else {
            console.log('Showing sidebar');
            showSidebar();
        }
    });
    
    // Hide sidebar when clicking overlay
    overlay.addEventListener('click', hideSidebar);
    
    // Hide sidebar when clicking outside
    document.addEventListener('click', function(e) {
        if (sidebar.classList.contains('open') && 
            !sidebar.contains(e.target) && 
            !mobileMenuToggle.contains(e.target)) {
            hideSidebar();
        }
    });
    
    // Hide sidebar on window resize to desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            hideSidebar();
        }
    });
    
    // Hide sidebar when navigating to different sections
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                hideSidebar();
            }
        });
    });
    
    // Hide sidebar on page load/refresh
    hideSidebar();
}

function initializeAdmin() {
    setupNavigation();
    loadDashboard();
    setupEventListeners();
}

// Navigation setup
function setupNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
}

function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Add active class to selected menu item
    const activeMenuItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }
    
    // Update page title
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    }
    
    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'products':
            loadProducts();
            break;
        case 'users':
            loadUsers();
            break;
        case 'orders':
            loadOrders();
            break;
    }
}

// Event listeners setup
function setupEventListeners() {
    // Product form submission
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
    
    // Image file selection display
    const imageInput = document.getElementById('product-image');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const filename = e.target.files[0] ? e.target.files[0].name : 'No file selected';
            document.getElementById('image-filename').textContent = filename;
        });
    }
    
    // Search and filter inputs
    const productSearch = document.getElementById('product-search');
    if (productSearch) {
        productSearch.addEventListener('input', debounce(filterProducts, 300));
    }
    
    // Category filter removed
    
    const genderFilter = document.getElementById('gender-filter');
    if (genderFilter) {
        genderFilter.addEventListener('change', filterProducts);
    }
    
    const userSearch = document.getElementById('user-search');
    if (userSearch) {
        userSearch.addEventListener('input', debounce(filterUsers, 300));
    }
    
    const orderStatusFilter = document.getElementById('order-status-filter');
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', filterOrders);
    }
}

// Dashboard functions
async function loadDashboard() {
    try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data.stats);
            updateRecentItems(data.stats);
        } else {
            showError('Failed to load dashboard data');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

function updateDashboardStats(stats) {
    document.getElementById('total-products').textContent = stats.total_products;
    document.getElementById('total-users').textContent = stats.total_users;
    document.getElementById('total-orders').textContent = stats.total_orders;
    document.getElementById('total-revenue').textContent = `₹${stats.total_revenue.toLocaleString('en-IN')}`;
}

function updateRecentItems(stats) {
    // Update recent products
    const recentProductsContainer = document.getElementById('recent-products');
    if (stats.recent_products && stats.recent_products.length > 0) {
        recentProductsContainer.innerHTML = stats.recent_products.map(product => `
            <div class="recent-item">
                <img src="${product.image_url}" alt="${product.title}" onerror="this.src='../img/placeholder.svg'">
                <div class="recent-item-info">
                    <h4>${product.title}</h4>
                    <p>₹${product.price.toLocaleString('en-IN')}</p>
                </div>
            </div>
        `).join('');
    } else {
        recentProductsContainer.innerHTML = '<div class="text-center">No recent products</div>';
    }
    
    // Update recent users
    const recentUsersContainer = document.getElementById('recent-users');
    if (stats.recent_users && stats.recent_users.length > 0) {
        recentUsersContainer.innerHTML = stats.recent_users.map(user => `
            <div class="recent-item">
                <div class="recent-item-info">
                    <h4>${user.name}</h4>
                    <p>${user.email}</p>
                </div>
            </div>
        `).join('');
    } else {
        recentUsersContainer.innerHTML = '<div class="text-center">No recent users</div>';
    }
}

// Product management functions
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        
        if (data.success) {
            displayProducts(data.products);
        } else {
            showError('Failed to load products');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Failed to load products');
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('products-table-body');
    const tableContainer = tbody ? tbody.closest('.table-container') : null;
    
    if (!tbody || !tableContainer) return;

    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No products found</td></tr>';
        return;
    }
    
    // Create mobile cards container
    let mobileCardsContainer = tableContainer.querySelector('.mobile-cards');
    if (!mobileCardsContainer) {
        mobileCardsContainer = document.createElement('div');
        mobileCardsContainer.className = 'mobile-cards';
        mobileCardsContainer.style.display = 'none';
        tableContainer.appendChild(mobileCardsContainer);
    }
    mobileCardsContainer.innerHTML = '';
    
    // Create desktop table rows
    const fragment = document.createDocumentFragment();
    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${product.id}</td>
            <td>
                <img src="${product.image_url || '../img/placeholder.svg'}" 
                     alt="${product.title}" 
                     onerror="this.src='../img/placeholder.svg'">
            </td>
            <td>${product.title}</td>
            <td>${product.category}</td>
            <td>${product.gender}</td>
            <td>₹${product.price.toLocaleString('en-IN')}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        fragment.appendChild(tr);
        
        // Create mobile card
        const mobileCard = document.createElement('div');
        mobileCard.className = 'mobile-card';
        mobileCard.innerHTML = `
            <div class="mobile-card-header">
                <div class="mobile-card-title">${product.title}</div>
                <div class="mobile-card-id">#${product.id}</div>
            </div>
            <div class="mobile-card-content">
                <div class="mobile-card-row">
                    <span class="mobile-card-label">Image:</span>
                    <img src="${product.image_url || '../img/placeholder.svg'}" 
                         alt="${product.title}" 
                         class="mobile-card-image"
                         onerror="this.src='../img/placeholder.svg'">
                </div>
                <div class="mobile-card-row">
                    <span class="mobile-card-label">Category:</span>
                    <span class="mobile-card-value">${product.category}</span>
                </div>
                <div class="mobile-card-row">
                    <span class="mobile-card-label">Gender:</span>
                    <span class="mobile-card-value">${product.gender}</span>
                </div>
                <div class="mobile-card-row">
                    <span class="mobile-card-label">Price:</span>
                    <span class="mobile-card-value">₹${product.price.toLocaleString('en-IN')}</span>
                </div>
                <div class="mobile-card-expandable" id="product-${product.id}-details">
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Description:</span>
                        <span class="mobile-card-value">${product.description || 'No description'}</span>
                    </div>
                </div>
                <button class="expand-btn" onclick="toggleProductDetails(${product.id})">
                    <span>View Details</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div class="mobile-card-actions">
                <button class="btn btn-sm btn-primary" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        mobileCardsContainer.appendChild(mobileCard);
    });
    tbody.appendChild(fragment);
}

function filterProducts() {
    const searchTerm = document.getElementById('product-search').value.toLowerCase();
    const categoryFilter = '';
    const genderFilter = document.getElementById('gender-filter').value;
    
    // Filter table rows
    const rows = document.querySelectorAll('#products-table-body tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return; // Skip loading/empty rows
        
        const title = cells[2].textContent.toLowerCase();
        const category = cells[3].textContent;
        const gender = normalizeGenderLabel(cells[4].textContent);
        
        const matchesSearch = title.includes(searchTerm);
        const matchesCategory = true; // category filter removed
        const matchesGender = !genderFilter || normalizeGenderLabel(genderFilter) === gender;
        
        if (matchesSearch && matchesCategory && matchesGender) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    
    // Filter mobile cards
    const mobileCards = document.querySelectorAll('.mobile-cards .mobile-card');
    mobileCards.forEach(card => {
        const title = card.querySelector('.mobile-card-title').textContent.toLowerCase();
        const genderElement = card.querySelector('.mobile-card-row:nth-child(4) .mobile-card-value');
        const gender = genderElement ? normalizeGenderLabel(genderElement.textContent) : '';
        
        const matchesSearch = title.includes(searchTerm);
        const matchesGender = !genderFilter || normalizeGenderLabel(genderFilter) === gender;
        
        if (matchesSearch && matchesGender) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function normalizeGenderLabel(value) {
    const s = String(value || '').toLowerCase();
    if (s.includes('him') || s === 'male' || s === 'men') return 'for him';
    if (s.includes('her') || s === 'female' || s === 'women') return 'for her';
    return 'unisex';
}

// Mobile card toggle functions
function toggleProductDetails(productId) {
    const details = document.getElementById(`product-${productId}-details`);
    const btn = details.previousElementSibling;
    
    if (details.classList.contains('show')) {
        details.classList.remove('show');
        btn.classList.remove('expanded');
        btn.querySelector('span').textContent = 'View Details';
    } else {
        details.classList.add('show');
        btn.classList.add('expanded');
        btn.querySelector('span').textContent = 'Hide Details';
    }
}

function toggleUserDetails(userId) {
    const details = document.getElementById(`user-${userId}-details`);
    const btn = details.previousElementSibling;
    
    if (details.classList.contains('show')) {
        details.classList.remove('show');
        btn.classList.remove('expanded');
        btn.querySelector('span').textContent = 'View Details';
    } else {
        details.classList.add('show');
        btn.classList.add('expanded');
        btn.querySelector('span').textContent = 'Hide Details';
    }
}

function toggleOrderDetails(orderId) {
    const details = document.getElementById(`order-${orderId}-details`);
    const btn = details.previousElementSibling;
    
    if (details.classList.contains('show')) {
        details.classList.remove('show');
        btn.classList.remove('expanded');
        btn.querySelector('span').textContent = 'View Details';
    } else {
        details.classList.add('show');
        btn.classList.add('expanded');
        btn.querySelector('span').textContent = 'Hide Details';
    }
}

function showAddProductModal() {
    currentProductId = null;
    document.getElementById('modal-title').textContent = 'Add Product';
    document.getElementById('submit-btn').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-modal').style.display = 'block';
}

async function editProduct(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();
        
        if (data.success) {
            const product = data.product;
            
            if (product) {
                currentProductId = productId;
                
                // Populate form
                document.getElementById('product-title').value = product.title || '';
                document.getElementById('product-gender').value = product.gender || '';
                document.getElementById('product-price').value = product.price || '';
                document.getElementById('product-description').value = product.description || '';
                document.getElementById('product-volume').value = product.volume || '';
                document.getElementById('product-longevity').value = product.longevity || '';
                
                // Reset image upload field
                document.getElementById('product-image').value = '';
                document.getElementById('image-filename').textContent = 'No file selected';
                
                // Update modal
                document.getElementById('modal-title').textContent = 'Edit Product';
                document.getElementById('submit-btn').textContent = 'Update Product';
                document.getElementById('product-modal').style.display = 'block';
            } else {
                alert('Product not found');
            }
        } else {
            alert('Error loading product: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading product:', error);
        alert('Failed to load product for editing');
    }
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;
        
        let response;
        if (currentProductId) {
            // Update existing product
            response = await fetch(`/api/admin/products/${currentProductId}`, {
                method: 'PUT',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // If there's an image file, upload it separately for updates
                const imageFile = document.getElementById('product-image').files[0];
                if (imageFile) {
                    await uploadImageForProduct(currentProductId, imageFile);
                }
                
                alert('Product updated successfully!');
                closeProductModal();
                loadProducts();
            } else {
                alert('Error: ' + result.message);
            }
        } else {
            // Create new product - include image in the same request
            response = await fetch('/api/admin/products', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Product added successfully!');
                closeProductModal();
                loadProducts();
            } else {
                alert('Error: ' + result.message);
            }
        }
        
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Failed to save product');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Upload image for a specific product
async function uploadImageForProduct(productId, imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    try {
        const response = await fetch(`/api/admin/upload-product-image/${productId}`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        if (!result.success) {
            console.error('Image upload failed:', result.message);
        } else {
            // Force refresh any existing product images in the table
            setTimeout(() => {
                const productImages = document.querySelectorAll(`img[src*="/api/product-image/${productId}"]`);
                productImages.forEach(img => {
                    const originalSrc = img.src.split('?')[0]; // Remove any existing cache busting
                    img.src = originalSrc + '?t=' + Date.now();
                });
            }, 100);
        }
    } catch (error) {
        console.error('Image upload error:', error);
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/products/${productId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            loadProducts(); // Refresh products list
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. Check console for details.');
    }
}

// Image upload functionality
function uploadImage(productId) {
    // Create file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }
        
        // Show loading state
        const uploadBtn = document.querySelector(`button[onclick="uploadImage(${productId})"]`);
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = 'Uploading...';
        uploadBtn.disabled = true;
        
        // Create FormData
        const formData = new FormData();
        formData.append('image', file);
        
        // Upload image
        fetch(`/api/admin/upload-product-image/${productId}`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Image uploaded successfully!');
                // Force refresh with cache busting
                setTimeout(() => {
                    loadProducts();
                    // Also force refresh any existing product images in the table
                    const productImages = document.querySelectorAll(`img[src*="/api/product-image/${productId}"]`);
                    productImages.forEach(img => {
                        const originalSrc = img.src.split('?')[0]; // Remove any existing cache busting
                        img.src = originalSrc + '?t=' + Date.now();
                    });
                }, 100);
            } else {
                alert('Error uploading image: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            alert('Failed to upload image');
        })
        .finally(() => {
            // Reset button state
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
        });
    });
    
    // Trigger file selection
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

// User management functions
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (data.success) {
            displayUsers(data.users);
        } else {
            showError('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('users-table-body');
    const tableContainer = tbody ? tbody.closest('.table-container') : null;
    
    console.log('Displaying users:', users.length);
    console.log('Users tbody:', tbody);
    console.log('Users tableContainer:', tableContainer);
    
    if (!tbody || !tableContainer) {
        console.error('Users table elements not found!');
        return;
    }

    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
        return;
    }
    
    // Create mobile cards container
    let mobileCardsContainer = tableContainer.querySelector('.mobile-cards');
    if (!mobileCardsContainer) {
        mobileCardsContainer = document.createElement('div');
        mobileCardsContainer.className = 'mobile-cards';
        mobileCardsContainer.style.display = 'none';
        tableContainer.appendChild(mobileCardsContainer);
        console.log('Created mobile cards container for users');
    }
    mobileCardsContainer.innerHTML = '';
    console.log('Mobile cards container:', mobileCardsContainer);
    
    // Create desktop table rows
    const fragment = document.createDocumentFragment();
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.id}</td>
            <td>${user.first_name} ${user.last_name}</td>
            <td>${user.email}</td>
            <td>${user.phone || 'N/A'}</td>
            <td>${user.gender || 'N/A'}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewUser(${user.id})" title="View User">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        fragment.appendChild(tr);
        
        // Create mobile card
        const mobileCard = document.createElement('div');
        mobileCard.className = 'mobile-card';
        mobileCard.innerHTML = `
            <div class="mobile-card-header">
                <div class="mobile-card-title">${user.first_name} ${user.last_name}</div>
                <div class="mobile-card-id">#${user.id}</div>
            </div>
            <div class="mobile-card-content">
                <div class="mobile-card-row">
                    <span class="mobile-card-label">Email:</span>
                    <span class="mobile-card-value">${user.email}</span>
                </div>
                <div class="mobile-card-row">
                    <span class="mobile-card-label">Phone:</span>
                    <span class="mobile-card-value">${user.phone || 'N/A'}</span>
                </div>
                <div class="mobile-card-row">
                    <span class="mobile-card-label">Gender:</span>
                    <span class="mobile-card-value">${user.gender || 'N/A'}</span>
                </div>
                <div class="mobile-card-row">
                    <span class="mobile-card-label">Joined:</span>
                    <span class="mobile-card-value">${new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div class="mobile-card-expandable" id="user-${user.id}-details">
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Date of Birth:</span>
                        <span class="mobile-card-value">${user.date_of_birth || 'N/A'}</span>
                    </div>
                </div>
                <div class="mobile-card-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewUser(${user.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        mobileCardsContainer.appendChild(mobileCard);
    });
    tbody.appendChild(fragment);
}

function filterUsers() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    
    // Filter table rows
    const rows = document.querySelectorAll('#users-table-body tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return; // Skip loading/empty rows
        
        const name = cells[1].textContent.toLowerCase();
        const email = cells[2].textContent.toLowerCase();
        
        if (name.includes(searchTerm) || email.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    
    // Filter mobile cards
    const mobileCards = document.querySelectorAll('.mobile-cards .mobile-card');
    mobileCards.forEach(card => {
        const title = card.querySelector('.mobile-card-title').textContent.toLowerCase();
        const emailElement = card.querySelector('.mobile-card-row:nth-child(1) .mobile-card-value');
        const email = emailElement ? emailElement.textContent.toLowerCase() : '';
        
        if (title.includes(searchTerm) || email.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function viewUser(userId) {
    const modal = document.getElementById('user-modal');
    modal.style.display = 'block';
    
    // Clear previous content
    document.getElementById('user-name').textContent = '';
    document.getElementById('user-email').textContent = '';
    document.getElementById('user-phone').textContent = '';
    document.getElementById('user-gender').textContent = '';
    document.getElementById('user-dob').textContent = '';
    document.getElementById('user-joined').textContent = '';
    document.getElementById('user-addresses').innerHTML = '<div class="loading">Loading addresses...</div>';
    document.getElementById('user-orders').innerHTML = '<div class="loading">Loading orders...</div>';
    
    // Fetch user details
    fetch(`/api/admin/users/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.user) {
                const user = data.user;
                
                // Populate user info
                document.getElementById('user-name').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A';
                document.getElementById('user-email').textContent = user.email || 'N/A';
                document.getElementById('user-phone').textContent = user.phone || 'N/A';
                document.getElementById('user-gender').textContent = user.gender || 'N/A';
                document.getElementById('user-dob').textContent = user.date_of_birth || 'N/A';
                document.getElementById('user-joined').textContent = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
                
                // Load user addresses
                loadUserAddresses(userId);
                
                // Load user orders
                loadUserOrders(userId);
            } else {
                alert('Error loading user details: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error loading user:', error);
            alert('Failed to load user details');
        });
}

function loadUserAddresses(userId) {
    fetch(`/api/admin/users/${userId}/addresses`)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('user-addresses');
            
            if (data.success && data.addresses && data.addresses.length > 0) {
                container.innerHTML = '';
                
                data.addresses.forEach(address => {
                    const addressCard = document.createElement('div');
                    addressCard.className = `address-card ${address.is_default ? 'default' : ''}`;
                    
                    addressCard.innerHTML = `
                        <div class="address-title">
                            <i class="fas fa-map-marker-alt"></i>
                            ${address.title || 'Address'}
                        </div>
                        <div class="address-details">
                            <strong>${address.first_name || ''} ${address.last_name || ''}</strong><br>
                            ${address.street_address || ''}<br>
                            ${address.apartment ? address.apartment + '<br>' : ''}
                            ${address.city || ''}, ${address.state || ''} ${address.postal_code || ''}<br>
                            ${address.country || ''}<br>
                            <strong>Phone:</strong> ${address.phone || 'N/A'}
                        </div>
                    `;
                    
                    container.appendChild(addressCard);
                });
            } else {
                container.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">No addresses found</div>';
            }
        })
        .catch(error => {
            console.error('Error loading addresses:', error);
            document.getElementById('user-addresses').innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;">Failed to load addresses</div>';
        });
}

function loadUserOrders(userId) {
    fetch(`/api/admin/users/${userId}/orders`)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('user-orders');
            
            if (data.success && data.orders && data.orders.length > 0) {
                container.innerHTML = '';
                
                data.orders.slice(0, 5).forEach(order => { // Show only last 5 orders
                    const orderItem = document.createElement('div');
                    orderItem.className = 'order-item';
                    
                    orderItem.innerHTML = `
                        <div class="order-info">
                            <div class="order-id">Order #${order.id}</div>
                            <div class="order-date">${new Date(order.created_at).toLocaleDateString()}</div>
                        </div>
                        <div class="order-status ${order.order_status || 'pending'}">${order.order_status || 'pending'}</div>
                        <div class="order-amount">₹${parseFloat(order.total_amount || 0).toLocaleString('en-IN')}</div>
                    `;
                    
                    container.appendChild(orderItem);
                });
            } else {
                container.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">No orders found</div>';
            }
        })
        .catch(error => {
            console.error('Error loading orders:', error);
            document.getElementById('user-orders').innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;">Failed to load orders</div>';
        });
}

function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

// Delete user function
function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their addresses and orders. This action cannot be undone.')) {
        return;
    }
    
    fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('User deleted successfully');
            loadUsers(); // Refresh users list
        } else {
            showError('Error deleting user: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error deleting user:', error);
        showError('Failed to delete user');
    });
}

// Order management functions
async function loadOrders() {
    try {
        const response = await fetch('/api/admin/orders');
        const data = await response.json();
        
        if (data.success) {
            displayOrders(data.orders);
        } else {
            showError('Failed to load orders: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showError('Failed to load orders');
    }
}

function displayOrders(orders) {
    const tableBody = document.getElementById('orders-table-body');
    const mobileCardsContainer = document.getElementById('orders-mobile-cards');
    
    if (!tableBody) return;
    
    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
        if (mobileCardsContainer) {
            mobileCardsContainer.innerHTML = '<div class="no-data">No orders found</div>';
        }
        return;
    }
    
    // Create desktop table rows
    const fragment = document.createDocumentFragment();
    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${order.id}</td>
            <td>${order.user_id}</td>
            <td>₹${parseFloat(order.total_amount || 0).toLocaleString('en-IN')}</td>
            <td><span class="status-badge status-${order.order_status || 'pending'}">${order.order_status || 'pending'}</span></td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewOrder(${order.id})" title="View Order">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteOrder(${order.id})" title="Delete Order">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        fragment.appendChild(tr);
    });
    
    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);
    
    // Create mobile cards if container exists
    if (mobileCardsContainer) {
        mobileCardsContainer.innerHTML = '';
        orders.forEach(order => {
            const mobileCard = document.createElement('div');
            mobileCard.className = 'mobile-card';
            mobileCard.innerHTML = `
                <div class="mobile-card-header">
                    <div class="mobile-card-title">Order #${order.id}</div>
                    <div class="status-badge status-${order.order_status || 'pending'}">${order.order_status || 'pending'}</div>
                </div>
                <div class="mobile-card-content">
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">User ID:</span>
                        <span class="mobile-card-value">${order.user_id}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Amount:</span>
                        <span class="mobile-card-value">₹${parseFloat(order.total_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Date:</span>
                        <span class="mobile-card-value">${new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="mobile-card-actions">
                        <button class="btn btn-sm btn-primary" onclick="viewOrder(${order.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteOrder(${order.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            mobileCardsContainer.appendChild(mobileCard);
        });
    }
}

// Delete order function
function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
        return;
    }
    
    fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('Order deleted successfully');
            loadOrders(); // Refresh orders list
        } else {
            showError('Error deleting order: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error deleting order:', error);
        showError('Failed to delete order');
    });
}

function filterOrders() {
    const statusFilter = document.getElementById('order-status-filter').value.toLowerCase();
    
    // Filter table rows
    const rows = document.querySelectorAll('#orders-table-body tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 6) return; // Skip loading/empty rows

        // Get status from the status badge in the Status column (4th column, index 3)
        const statusBadge = cells[3].querySelector('.status-badge');
        const status = statusBadge ? statusBadge.textContent.trim().toLowerCase() : '';

        if (!statusFilter || status === statusFilter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    
    // Filter mobile cards
    const mobileCards = document.querySelectorAll('#orders-mobile-cards .mobile-card');
    mobileCards.forEach(card => {
        const statusElement = card.querySelector('.status-badge');
        const status = statusElement ? statusElement.textContent.trim().toLowerCase() : '';

        if (!statusFilter || status === statusFilter) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function viewOrder(orderId) {
    currentOrderId = orderId;
    
    fetch(`/api/orders/${orderId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.order) {
                const order = data.order;
                
                document.getElementById('order-details').innerHTML = `
                    <div class="order-details">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Order ID</label>
                                <input type="text" value="#${order.id}" readonly>
                            </div>
                            <div class="form-group">
                                <label>Total Amount</label>
                                <input type="text" value="₹${order.total_amount.toLocaleString('en-IN')}" readonly>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Payment Method</label>
                                <input type="text" value="${order.payment_method}" readonly>
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <input type="text" value="${order.status}" readonly>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Shipping Address</label>
                            <textarea readonly rows="3">${order.shipping_address}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Order Date</label>
                            <input type="text" value="${new Date(order.created_at).toLocaleString()}" readonly>
                        </div>
                        <div class="form-group">
                            <label>Order Items</label>
                            <div class="order-items">
                                ${order.items.map(item => `
                                    <div class="order-item">
                                        <strong>${item.product_title}</strong><br>
                                        Quantity: ${item.quantity} × ₹${item.price.toLocaleString('en-IN')}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
                
                document.getElementById('order-modal').style.display = 'block';
            } else {
                showError('Failed to load order data');
            }
        })
        .catch(error => {
            console.error('Error loading order:', error);
            showError('Failed to load order data');
        });
}

function closeOrderModal() {
    document.getElementById('order-modal').style.display = 'none';
    currentOrderId = null;
}

// Function to update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Order status updated successfully!');
            // Refresh the orders list to show updated status
            loadOrders();
        } else {
            alert('Error updating order status: ' + data.message);
            // Reset the dropdown to previous value
            loadOrders();
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Failed to update order status. Please try again.');
        // Reset the dropdown to previous value
        loadOrders();
    }
}

// Utility functions
function refreshData() {
    console.log('RefreshData called');
    
    // Try multiple ways to find the active section
    let activeSection = null;
    
    // Method 1: Look for section without display:none
    const visibleSections = document.querySelectorAll('.content-section');
    visibleSections.forEach(section => {
        const style = window.getComputedStyle(section);
        if (style.display !== 'none') {
            activeSection = section;
            console.log('Found visible section:', section.id);
        }
    });
    
    // Method 2: Look for section with active class
    if (!activeSection) {
        activeSection = document.querySelector('.content-section.active');
        if (activeSection) {
            console.log('Found active section:', activeSection.id);
        }
    }
    
    // Method 3: Check all sections and find the one that's visible
    if (!activeSection) {
        visibleSections.forEach(section => {
            if (section.offsetParent !== null) { // Element is visible
                activeSection = section;
                console.log('Found offset visible section:', section.id);
            }
        });
    }
    
    if (!activeSection) {
        console.log('No active section found');
        showError('Could not determine active section');
        return;
    }
    
    const sectionId = activeSection.id;
    console.log('Refreshing section:', sectionId);
    
    try {
        switch(sectionId) {
            case 'dashboard':
                console.log('Loading dashboard...');
                loadDashboard();
                setTimeout(() => showSuccess('Dashboard refreshed'), 500);
                break;
            case 'products':
                console.log('Loading products...');
                loadProducts();
                setTimeout(() => showSuccess('Products refreshed'), 500);
                break;
            case 'users':
                console.log('Loading users...');
                loadUsers();
                setTimeout(() => showSuccess('Users refreshed'), 500);
                break;
            case 'orders':
                console.log('Loading orders...');
                loadOrders();
                setTimeout(() => showSuccess('Orders refreshed'), 500);
                break;
            default:
                console.log('No refresh function for section:', sectionId);
                showError('No refresh function for this section');
        }
    } catch (error) {
        console.error('Error during refresh:', error);
        showError('Error refreshing data');
    }
}

function refreshCurrentSection() {
    // This is an alias for refreshData to maintain compatibility
    console.log('RefreshCurrentSection called');
    refreshData();
}

function showSuccess(message) {
    // Simple success notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 3000;
        box-shadow: var(--shadow);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showError(message) {
    // Simple error notification
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--danger-color);
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 3000;
        box-shadow: var(--shadow);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Close modals when clicking outside
window.onclick = function(event) {
    const productModal = document.getElementById('product-modal');
    const userModal = document.getElementById('user-modal');
    const orderModal = document.getElementById('order-modal');
    
    if (event.target === productModal) {
        closeProductModal();
    }
    if (event.target === userModal) {
        closeUserModal();
    }
    if (event.target === orderModal) {
        closeOrderModal();
    }
}
