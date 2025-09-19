// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load products on index page
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
        loadFeaturedProducts();
    }
    
    // Load products on perfumes page
    if (window.location.pathname.includes('perfumes.html')) {
        loadAllProducts();
    }
    
    // Authentication handling for account page
    if (window.location.pathname.includes('account.html')) {
        const authContainer = document.getElementById('auth-container');
        const accountSection = document.getElementById('account-section');
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const loginMessage = document.getElementById('login-message');
        const registerMessage = document.getElementById('register-message');
        
        // Check if user is already logged in
        checkAuthStatus();
        
        // Tab switching
        loginTab.addEventListener('click', function() {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
        });
        
        registerTab.addEventListener('click', function() {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerForm.classList.add('active');
            loginForm.classList.remove('active');
        });
        
        // Login form submission
        if (loginBtn) {
            loginBtn.addEventListener('click', function() {
                const identifierInput = document.getElementById('login-identifier');
                const identifier = identifierInput ? identifierInput.value.trim() : '';
                const password = document.getElementById('login-password').value;

                // Validate inputs: need password and either email or phone
                if (!identifier || !password) {
                    showMessage(loginMessage, 'Enter email or phone, and password', 'error');
                    return;
                }

                const payload = { password };
                // Basic detection: if it looks like an email, send email; else send phone
                const isEmail = /@/.test(identifier);
                if (isEmail) {
                    payload.email = identifier;
                } else {
                    payload.phone = identifier;
                }

                // Send login request
                fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    credentials: 'include'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showMessage(loginMessage, data.message, 'success');
                        setTimeout(() => {
                            loadUserData();
                            showAccountSection();
                        }, 1000);
                    } else {
                        showMessage(loginMessage, data.message, 'error');
                    }
                })
                .catch(error => {
                    showMessage(loginMessage, 'An error occurred. Please try again.', 'error');
                    console.error('Login error:', error);
                });
            });
        }
        
        // Register form submission
        if (registerBtn) {
            registerBtn.addEventListener('click', function() {
                const firstName = document.getElementById('register-first-name').value;
                const lastName = document.getElementById('register-last-name').value;
                const email = document.getElementById('register-email').value;
                const phoneInput = document.getElementById('register-phone');
                const phone = phoneInput ? phoneInput.value : '';
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirm-password').value;
                
                // Validate inputs
                if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
                    showMessage(registerMessage, 'Please fill in all fields (email and phone required)', 'error');
                    return;
                }
                
                if (password !== confirmPassword) {
                    showMessage(registerMessage, 'Passwords do not match', 'error');
                    return;
                }
                
                // Send registration request
                fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ first_name: firstName, last_name: lastName, email, phone, password }),
                    credentials: 'include'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showMessage(registerMessage, data.message, 'success');
                        setTimeout(() => {
                            loadUserData();
                            showAccountSection();
                        }, 1000);
                    } else {
                        showMessage(registerMessage, data.message, 'error');
                    }
                })
                .catch(error => {
                    showMessage(registerMessage, 'An error occurred. Please try again.', 'error');
                    console.error('Registration error:', error);
                });
            });
        }
        
        // Helper functions
        function showMessage(element, message, type) {
            element.textContent = message;
            element.className = 'form-message ' + type;
            element.style.display = 'block';
        }
        
        function showAuthContainer() {
            authContainer.style.display = 'block';
            accountSection.style.display = 'none';
        }
        
        function showAccountSection() {
            authContainer.style.display = 'none';
            accountSection.style.display = 'block';
        }
        
        function checkAuthStatus() {
            fetch('/api/check-auth', {
                method: 'GET',
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.authenticated) {
                    loadUserData();
                    showAccountSection();
                } else {
                    showAuthContainer();
                }
            })
            .catch(error => {
                console.error('Auth check error:', error);
                showAuthContainer();
            });
        }
        
        function loadUserData() {
            fetch('/api/user', {
                method: 'GET',
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update profile information
                    const user = data.user;
                    document.querySelector('.profile-name').textContent = user.first_name + ' ' + user.last_name;
                    document.querySelector('.profile-email').textContent = user.email;
                    
                    // Update form fields in edit profile section
                    const inputs = document.querySelectorAll('#edit-profile-section input, #edit-profile-section select');
                    inputs.forEach(input => {
                        if (input.type === 'text' || input.type === 'email' || input.type === 'tel' || input.type === 'date') {
                            // Map input fields to user data
                            if (input.placeholder && input.placeholder.toLowerCase().includes('first name')) {
                                input.value = user.first_name;
                            } else if (input.placeholder && input.placeholder.toLowerCase().includes('last name')) {
                                input.value = user.last_name;
                            } else if (input.placeholder && input.placeholder.toLowerCase().includes('email')) {
                                input.value = user.email;
                            } else if (input.type === 'tel' && user.phone) {
                                input.value = user.phone;
                            } else if (input.type === 'date' && user.date_of_birth) {
                                input.value = user.date_of_birth;
                            }
                        } else if (input.tagName === 'SELECT') {
                            // Handle select elements
                            if (input.name === 'gender' && user.gender) {
                                for (let i = 0; i < input.options.length; i++) {
                                    if (input.options[i].value === user.gender.toLowerCase()) {
                                        input.selectedIndex = i;
                                        break;
                                    }
                                }
                            } else if (input.name === 'fragrance' && user.preferred_fragrance) {
                                for (let i = 0; i < input.options.length; i++) {
                                    if (input.options[i].value === user.preferred_fragrance.toLowerCase()) {
                                        input.selectedIndex = i;
                                        break;
                                    }
                                }
                            }
                        }
                    });
                    
                    // Add event listener to save profile button
                    const saveButton = document.querySelector('#edit-profile-section .btn-primary');
                    if (saveButton && !saveButton.hasEventListener) {
                        saveButton.hasEventListener = true;
                        saveButton.addEventListener('click', updateUserProfile);
                    }
                }
            })
            .catch(error => {
                console.error('Error loading user data:', error);
            });
        }
        
        function updateUserProfile() {
            // Get form values
            const formData = {};
            const inputs = document.querySelectorAll('#edit-profile-section input:not([type="password"]), #edit-profile-section select');
            
            inputs.forEach(input => {
                if (input.type === 'text' || input.type === 'email' || input.type === 'tel' || input.type === 'date') {
                    // Map input fields to user data properties
                    if (input.placeholder && input.placeholder.toLowerCase().includes('first name')) {
                        formData.first_name = input.value;
                    } else if (input.placeholder && input.placeholder.toLowerCase().includes('last name')) {
                        formData.last_name = input.value;
                    } else if (input.placeholder && input.placeholder.toLowerCase().includes('email')) {
                        formData.email = input.value;
                    } else if (input.type === 'tel') {
                        formData.phone = input.value;
                    } else if (input.type === 'date') {
                        formData.date_of_birth = input.value;
                    }
                } else if (input.tagName === 'SELECT') {
                    // Handle select elements
                    if (input.name === 'gender') {
                        formData.gender = input.value;
                    } else if (input.name === 'fragrance') {
                        formData.preferred_fragrance = input.value;
                    }
                }
            });
            
            // Handle password update if provided
            const currentPassword = document.querySelector('#edit-profile-section input[placeholder="Enter current password"]');
            const newPassword = document.querySelector('#edit-profile-section input[placeholder="Enter new password"]');
            const confirmPassword = document.querySelector('#edit-profile-section input[placeholder="Confirm new password"]');
            
            if (currentPassword && currentPassword.value && newPassword && newPassword.value) {
                if (newPassword.value !== confirmPassword.value) {
                    showProfileMessage('New passwords do not match', 'error');
                    return;
                }
                formData.current_password = currentPassword.value;
                formData.password = newPassword.value;
            }
            
            // Send update request
            fetch('/api/user', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showProfileMessage(data.message, 'success');
                    // Reload user data to update the profile
                    setTimeout(loadUserData, 1000);
                } else {
                    showProfileMessage(data.message, 'error');
                }
            })
            .catch(error => {
                showProfileMessage('An error occurred. Please try again.', 'error');
                console.error('Update error:', error);
            });
        }
        
        function showProfileMessage(message, type) {
            const messageElement = document.createElement('div');
            messageElement.textContent = message;
            messageElement.className = 'form-message ' + type;
            messageElement.style.display = 'block';
            
            // Find a place to show the message
            const container = document.querySelector('#edit-profile-section');
            const existingMessage = container.querySelector('.form-message');
            
            if (existingMessage) {
                existingMessage.textContent = message;
                existingMessage.className = 'form-message ' + type;
            } else {
                container.insertBefore(messageElement, container.firstChild);
            }
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 5000);
        }
    }
    // Define separate product card handlers for different page types
    const mainProductCards = document.querySelectorAll('.product-card:not(.product-history .product-card)');
    const accountProductCards = document.querySelectorAll('.product-history .product-card');
    
    // Handle main product cards (with overlays)
    if (mainProductCards.length > 0) {
        // Remove preloader code since we're removing preloaders from all HTML files
    // Price Range Sliders
    const minPriceSlider = document.getElementById('min-price');
    const maxPriceSlider = document.getElementById('max-price');
    const minPriceValue = document.getElementById('min-price-value');
    const maxPriceValue = document.getElementById('max-price-value');
    
    const mobileMinPriceSlider = document.getElementById('mobile-min-price');
    const mobileMaxPriceSlider = document.getElementById('mobile-max-price');
    const mobileMinPriceValue = document.getElementById('mobile-min-price-value');
    const mobileMaxPriceValue = document.getElementById('mobile-max-price-value');
    
    // Initialize desktop price sliders
    if (minPriceSlider && maxPriceSlider) {
        minPriceSlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            if (value > parseInt(maxPriceSlider.value)) {
                this.value = maxPriceSlider.value;
                return;
            }
            minPriceValue.textContent = '₹' + value.toLocaleString('en-IN');
        });
        
        maxPriceSlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            if (value < parseInt(minPriceSlider.value)) {
                this.value = minPriceSlider.value;
                return;
            }
            maxPriceValue.textContent = '₹' + value.toLocaleString('en-IN');
        });
    }
    
    // Initialize mobile price sliders
    if (mobileMinPriceSlider && mobileMaxPriceSlider) {
        mobileMinPriceSlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            if (value > parseInt(mobileMaxPriceSlider.value)) {
                this.value = mobileMaxPriceSlider.value;
                return;
            }
            mobileMinPriceValue.textContent = '₹' + value.toLocaleString('en-IN');
        });
        
        mobileMaxPriceSlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            if (value < parseInt(mobileMinPriceSlider.value)) {
                this.value = mobileMinPriceSlider.value;
                return;
            }
            mobileMaxPriceValue.textContent = '₹' + value.toLocaleString('en-IN');
        });
    }
    // Preloader code removed

    // Hamburger Menu Toggle (initialized globally below)
    
    // Explore Page Filter Drawer
    const filterToggleBtn = document.querySelector('.filter-toggle-btn');
    const mobileFilterDrawer = document.querySelector('.mobile-filter-drawer');
    const closeDrawerBtn = document.querySelector('.close-drawer');
    
    if (filterToggleBtn && mobileFilterDrawer && closeDrawerBtn) {
        filterToggleBtn.addEventListener('click', function() {
            mobileFilterDrawer.classList.add('active');
        });
        
        closeDrawerBtn.addEventListener('click', function() {
            mobileFilterDrawer.classList.remove('active');
        });
    }

    // Header scroll effect
    const header = document.querySelector('header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Fade-in animation for sections
    const fadeElements = document.querySelectorAll('.section-header, .perfumery-content, .about-content, .product-card');
    
    const fadeInObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                fadeInObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    fadeElements.forEach(element => {
        fadeInObserver.observe(element);
    });

    // Product image hover effect
    }
    
    // Always initialize Hamburger Menu Toggle (works on all pages)
    (function initHamburger() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        const body = document.body;
        if (!hamburger || !navMenu) return;
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            body.classList.toggle('no-scroll');
        });
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                body.classList.remove('no-scroll');
            });
        });
    })();

    // Handle account page product cards (without overlays)
    if (accountProductCards.length > 0) {
        // No special handling needed for these cards
    }
    
    // Original product card handler (for backward compatibility)
    const productCards = document.querySelectorAll('.product-card:not(.product-history .product-card)');
    
    productCards.forEach(card => {
        const overlay = card.querySelector('.product-overlay');
        
        // Only add event listeners if overlay exists
        if (overlay) {
            card.addEventListener('mouseenter', function() {
                overlay.style.opacity = '1';
            });
            
            card.addEventListener('mouseleave', function() {
                overlay.style.opacity = '0';
            });
            
            // Add mobile view button for small screens
            const productInfo = card.querySelector('.product-info');
            const viewLink = overlay.querySelector('a')?.getAttribute('href');
            
            if (viewLink) {
                // Create mobile view button
                const mobileViewBtn = document.createElement('a');
            
                mobileViewBtn.className = 'mobile-view-btn';
                mobileViewBtn.textContent = 'View';
                mobileViewBtn.href = viewLink;
                
                // Append button only on mobile
                if (window.innerWidth <= 767 && productInfo) {
                    productInfo.appendChild(mobileViewBtn);
                }
            }
        }
    });
    
    // Handle resize to add/remove mobile buttons
    window.addEventListener('resize', function() {
        productCards.forEach(card => {
            const productInfo = card.querySelector('.product-info');
            if (productInfo) {
                const existingBtn = productInfo.querySelector('.mobile-view-btn');
                const overlay = card.querySelector('.product-overlay');
                if (overlay && overlay.querySelector('a')) {
                    const viewLink = overlay.querySelector('a').getAttribute('href');
            
                    if (window.innerWidth <= 767) {
                        // Add button if it doesn't exist
                        if (!existingBtn) {
                            const mobileViewBtn = document.createElement('a');
                            mobileViewBtn.className = 'mobile-view-btn';
                            mobileViewBtn.textContent = 'View';
                            mobileViewBtn.href = viewLink;
                            productInfo.appendChild(mobileViewBtn);
                        }
                    } else {
                        // Remove button if it exists
                        if (existingBtn) {
                            productInfo.removeChild(existingBtn);
                        }
                    }
                }
            }
        });
    });

    // Form submission handling
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            // For forms using formsubmit.co, we don't need to prevent default
            // This is just for additional validation or feedback
            const emailInput = form.querySelector('input[type="email"]');
            if (emailInput && !isValidEmail(emailInput.value)) {
                e.preventDefault();
                alert('Please enter a valid email address.');
            } else {
                // Show success message for newsletter form
                if (form.classList.contains('newsletter-form')) {
                    const successMessage = document.createElement('div');
                    successMessage.className = 'success-message';
                    successMessage.textContent = 'Thank you for subscribing!';
                    form.appendChild(successMessage);
                    
                    setTimeout(() => {
                        successMessage.style.opacity = '0';
                        setTimeout(() => {
                            successMessage.remove();
                        }, 500);
                    }, 3000);
                }
            }
        });
    });

    // Email validation helper function
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Add texture overlay to body
    const textureOverlay = document.createElement('div');
    textureOverlay.className = 'texture-overlay';
    document.body.appendChild(textureOverlay);

    // Initialize product details page if on that page
    if (window.location.pathname.includes('product-details.html')) {
        initProductDetails();
    }

    // Initialize cart functionality if on cart page
    if (window.location.pathname.includes('cart.html')) {
        initCart();
    }
});

// Helper to force-refresh images by appending a timestamp
function withCacheBust(url) {
    if (!url) return url;
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + 't=' + Date.now();
}

// Product Details Page Initialization
function initProductDetails() {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (productId) {
        // Fetch product details from API
        fetchProductDetails(productId);
        // Also fetch related products
        fetchRelatedProducts(productId);
    }
}

// Fetch product details from API
function fetchProductDetails(productId) {
    // Show loading state
    const detailsContainer = document.querySelector('.product-details-container');
    if (detailsContainer) {
        detailsContainer.innerHTML = '<div class="loading">Loading product details...</div>';
    }
    
    // Fetch product details from API
    fetch(`/api/products/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.product) {
                displayProductDetails(data.product);
            } else {
                if (detailsContainer) {
                    detailsContainer.innerHTML = '<div class="error">Product not found.</div>';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching product details:', error);
            if (detailsContainer) {
                detailsContainer.innerHTML = '<div class="error">Failed to load product details. Please try again later.</div>';
            }
        });
}

// Fetch related products
function fetchRelatedProducts(productId) {
    const relatedContainer = document.querySelector('.related-products-container');
    if (!relatedContainer) return;
    
    // Show loading state
    relatedContainer.innerHTML = '<div class="loading">Loading related products...</div>';
    
    // Fetch related products from API
    fetch(`/api/products/${productId}/related`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.related_products && data.related_products.length > 0) {
                // Clear loading state
                relatedContainer.innerHTML = '';
                
                // Display related products
                data.related_products.forEach(product => {
                    const productCard = createProductCard(product);
                    relatedContainer.appendChild(productCard);
                });
            } else {
                relatedContainer.innerHTML = '<div class="no-products">No related products available.</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching related products:', error);
            relatedContainer.innerHTML = '<div class="error">Failed to load related products.</div>';
        });
}

// Display product details on the page
function displayProductDetails(product) {
    const detailsContainer = document.querySelector('.product-details-container');
    if (detailsContainer) {
        // Clear loading state
        detailsContainer.innerHTML = '';
        
        // Recreate the product details structure
        const productDetailsHTML = `
            <div class="product-images">
                <div class="main-image">
                    <img src="${withCacheBust(product.image_url)}" alt="${product.title}" class="product-main-image">
                </div>
            </div>
            <div class="product-info">
                <h1 class="product-name">${product.title}</h1>
                <p class="product-category">${product.category} · ${product.gender}</p>
                <div class="product-rating">
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star-half-alt"></i>
                </div>
                <p class="product-price">₹${typeof product.price === 'number' ? product.price.toLocaleString('en-IN') : parseInt(String(product.price).replace(/[^0-9]/g, ''))?.toLocaleString('en-IN') || 'N/A'}</p>
                <div class="product-details">
                    <p class="product-description">${product.description}</p>
                    <div class="product-specs">
                        <div class="spec">
                            <span class="spec-label">Volume:</span>
                            <span class="spec-value">${product.volume || 'N/A'}</span>
                        </div>
                        <div class="spec">
                            <span class="spec-label">Longevity:</span>
                            <span class="spec-value">${product.longevity || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="product-actions">
                    <div class="quantity">
                        <button class="quantity-btn minus">-</button>
                        <input type="number" value="1" min="1" class="quantity-input">
                        <button class="quantity-btn plus">+</button>
                    </div>
                    <button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
                </div>
            </div>
        `;
        
        detailsContainer.innerHTML = productDetailsHTML;
        
        // Set up quantity buttons
        const minusBtn = detailsContainer.querySelector('.quantity-btn.minus');
        const plusBtn = detailsContainer.querySelector('.quantity-btn.plus');
        const quantityInput = detailsContainer.querySelector('.quantity-input');
        
        minusBtn.addEventListener('click', function() {
            const currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });
        
        plusBtn.addEventListener('click', function() {
            const currentValue = parseInt(quantityInput.value);
            quantityInput.value = currentValue + 1;
        });
        
        // Set up add to cart button
        const addToCartBtn = detailsContainer.querySelector('.add-to-cart-btn');
        addToCartBtn.addEventListener('click', function() {
            const quantity = parseInt(quantityInput.value);
            const productId = this.getAttribute('data-id');
            
            // Get existing cart or create new one
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            
            // Check if product already in cart
            const existingProduct = cart.find(item => item.id === productId);
            
            if (existingProduct) {
                existingProduct.quantity += quantity;
                // ensure latest image is used
                existingProduct.image = withCacheBust(product.image_url);
            } else {
                cart.push({
                    id: productId,
                    title: product.title,
                    price: product.price,
                    image: withCacheBust(product.image_url),
                    quantity: quantity
                });
            }
            
            // Save cart to localStorage
            localStorage.setItem('cart', JSON.stringify(cart));
            
            // Show notification
            showNotification(product.title + ' added to cart!');
        });
    }
}

// Helper function to show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-check-circle"></i>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add styles
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = 'var(--primary-color)';
    notification.style.color = 'white';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    notification.style.zIndex = '1000';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    notification.style.transition = 'opacity 0.3s, transform 0.3s';
    
    // Show notification
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        // Remove from DOM after transition
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Function to load featured products on the index page
function loadFeaturedProducts() {
    const featuredProductsContainer = document.getElementById('featured-products-container');
    if (!featuredProductsContainer) return;
    
    // Show loading state
    featuredProductsContainer.innerHTML = '<div class="loading">Loading products...</div>';
    
    // Fetch products from API
    fetch('/api/products')
        .then(response => response.json())
        .then(data => {
            const products = Array.isArray(data) ? data : (data.products || []);
            if (products.length > 0) {
                // Clear loading state
                featuredProductsContainer.innerHTML = '';
                
                // Display only the first 3 products for featured section
                const featuredProducts = products.slice(0, 3);
                
                featuredProducts.forEach(product => {
                    const productCard = createProductCard(product);
                    featuredProductsContainer.appendChild(productCard);
                });
            } else {
                featuredProductsContainer.innerHTML = '<div class="no-products">No products available at the moment.</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching products:', error);
            featuredProductsContainer.innerHTML = '<div class="error">Failed to load products. Please try again later.</div>';
        });
}

// Function to load all products on the perfumes page
function loadAllProducts() {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;
    
    // Show loading state
    productsContainer.innerHTML = '<div class="loading">Loading products...</div>';
    
    // Fetch products from API
    fetch('/api/products')
        .then(response => response.json())
        .then(data => {
            const products = Array.isArray(data) ? data : (data.products || []);
            if (products.length > 0) {
                // Clear loading state
                productsContainer.innerHTML = '';
                
                // Display all products
                products.forEach(product => {
                    const productCard = createProductCard(product);
                    productsContainer.appendChild(productCard);
                });
                
                // Set up gender filter functionality
                setupGenderFilter(products, productsContainer);
            } else {
                productsContainer.innerHTML = '<div class="no-products">No products available at the moment.</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching products:', error);
            productsContainer.innerHTML = '<div class="error">Failed to load products. Please try again later.</div>';
        });
}

// Function to create a product card element
function createProductCard(product) {
    const productCard = document.createElement('article');
    productCard.className = 'product-card';
    const genderKey = normalizeGender(product.gender);
    productCard.setAttribute('data-gender', genderKey);
    productCard.setAttribute('role', 'listitem');
    productCard.setAttribute('data-product-id', product.id);
    
    // Format price to Indian Rupees
    const priceValue = typeof product.price === 'number'
        ? product.price
        : parseInt(String(product.price || '').replace(/[^0-9]/g, ''));
    const formattedPrice = '₹' + (isNaN(priceValue) ? 0 : priceValue).toLocaleString('en-IN');
    
    productCard.innerHTML = `
        <div class="product-image">
            <img src="${product.image_url || 'img/placeholder.svg'}" alt="${product.title || 'Product'}" loading="lazy">
            <div class="product-overlay">
                <a href="product-details.html?id=${product.id}" class="overlay-btn">View Details</a>
            </div>
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.title || ''}</h3>
            <p class="product-category">${product.category || 'Perfume'} · ${genderLabel(genderKey)}</p>
            <p class="product-price">${formattedPrice}</p>
            <a href="product-details.html?id=${product.id}" class="mobile-view-btn">View Details</a>
        </div>
    `;
    
    // Make the entire card clickable
    productCard.addEventListener('click', function(e) {
        // Prevent click if the user clicked on a link or button inside the card
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
            return;
        }
        
        // Navigate to product details page
        const productId = this.getAttribute('data-product-id');
        console.log('Navigating to product details page with ID:', productId);
        window.location.href = 'product-details.html?id=' + productId;
    });
    
    return productCard;
}

// Normalize gender to keys: 'him' | 'her' | 'unisex'
function normalizeGender(gender) {
    const s = String(gender || '').toLowerCase().replace(/[^a-z]/g, '');
    if (s.includes('him') || s === 'male' || s === 'men' || s.includes('boy')) return 'him';
    if (s.includes('her') || s === 'female' || s === 'women' || s.includes('girl')) return 'her';
    return 'unisex';
}

function genderLabel(key) {
    if (key === 'him') return 'For Him';
    if (key === 'her') return 'For Her';
    return 'Unisex';
}

// Function to set up gender filter on perfumes page
function setupGenderFilter(products, container) {
    const filterButtons = document.querySelectorAll('.gender-filter .filter-btn');
    if (!filterButtons.length) return;
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-pressed', 'true');
            
            const gender = this.getAttribute('data-gender');
            // Filter products
            const productCards = container.querySelectorAll('.product-card');
            productCards.forEach(card => {
                const key = card.getAttribute('data-gender');
                if (gender === 'all' || key === gender) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// Cart Functionality
function initCart() {
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartContent = document.querySelector('.cart-content');
    const emptyState = document.querySelector('.cart-empty');
    if (!cartItemsContainer) return;

    // Load cart from localStorage
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('cart')) || [];
    } catch (e) {
        cart = [];
    }

    // Remove any placeholder items
    cartItemsContainer.querySelectorAll('.cart-item').forEach(el => el.remove());

    if (!cart.length) {
        if (cartContent) cartContent.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        updateCartTotal();
        return;
    }

    if (cartContent) cartContent.style.display = '';
    if (emptyState) emptyState.style.display = 'none';

    // Render items
    cart.forEach(item => {
        const unitPrice = typeof item.price === 'number'
            ? item.price
            : parseInt(String(item.price || '').replace(/[^0-9]/g, '')) || 0;
        const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;

        const el = document.createElement('div');
        el.className = 'cart-item';
        el.setAttribute('data-id', item.id);
        el.setAttribute('data-unit-price', String(unitPrice));
        const imgSrc = item.image && item.image.includes('/api/product-image/') ? withCacheBust(item.image) : item.image;
        el.innerHTML = `
            <div class="custom-checkbox item-checkbox"></div>
            <img src="${imgSrc}" alt="${item.title}" class="cart-item-image">
            <div class="cart-item-details">
                <h3 class="cart-item-name">${item.title}</h3>
                <div class="cart-item-price">₹${unitPrice.toLocaleString('en-IN')}</div>
                <div class="cart-item-meta"><span>—</span></div>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-control">
                    <button class="quantity-btn decrease">-</button>
                    <input type="number" class="quantity-input" value="${qty}" min="1" max="10">
                    <button class="quantity-btn increase">+</button>
                </div>
                <button class="remove-item"><i class="fas fa-trash-alt"></i> Remove</button>
                <a href="product-details.html?id=${item.id}" class="btn btn-primary shop-now-btn" data-product-id="${item.id}"><i class="fas fa-shopping-cart"></i> Shop Now</a>
            </div>
        `;
        cartItemsContainer.appendChild(el);
    });

    // Wire events
    cartItemsContainer.querySelectorAll('.quantity-btn.decrease').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.nextElementSibling;
            let v = parseInt(input.value) || 1;
            if (v > 1) {
                input.value = String(v - 1);
                persistCartFromDOM();
                updateCartTotal();
            }
        });
    });
    cartItemsContainer.querySelectorAll('.quantity-btn.increase').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            let v = parseInt(input.value) || 1;
            if (v < 10) {
                input.value = String(v + 1);
                persistCartFromDOM();
                updateCartTotal();
            }
        });
    });
    cartItemsContainer.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', function() {
            let v = parseInt(this.value);
            if (isNaN(v) || v < 1) v = 1;
            if (v > 10) v = 10;
            this.value = String(v);
            persistCartFromDOM();
            updateCartTotal();
        });
    });
    cartItemsContainer.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('.cart-item');
            if (row && row.parentElement) row.parentElement.removeChild(row);
            persistCartFromDOM();
            updateCartTotal();
            if (!cartItemsContainer.querySelector('.cart-item')) {
                if (cartContent) cartContent.style.display = 'none';
                if (emptyState) emptyState.style.display = 'block';
            }
        });
    });
    
    // Add event listeners for Shop Now buttons - proceed to checkout with only this item
    cartItemsContainer.querySelectorAll('.shop-now-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (e && e.preventDefault) e.preventDefault();
            const row = this.closest('.cart-item');
            if (!row) return;
            const productId = this.getAttribute('data-product-id');
            const unitPrice = parseInt(row.getAttribute('data-unit-price') || '0');
            const quantity = parseInt(row.querySelector('.quantity-input')?.value || '1');
            const title = row.querySelector('.cart-item-name')?.textContent || '';
            const image = row.querySelector('.cart-item-image')?.getAttribute('src') || '';
            const checkoutItems = [{ id: productId, name: title, price: `₹${unitPrice.toLocaleString('en-IN')}`, image, quantity }];
            localStorage.setItem('checkoutItems', JSON.stringify(checkoutItems));
            window.location.href = 'checkout.html';
        });
    });

    // Shop All button at bottom of cart page
    const shopAllBottomBtn = document.getElementById('shop-all-bottom');
    if (shopAllBottomBtn) {
        shopAllBottomBtn.addEventListener('click', function(e) {
            if (e && e.preventDefault) e.preventDefault();
            const items = Array.from(document.querySelectorAll('.cart-item')).map(row => ({
                id: row.getAttribute('data-id'),
                name: row.querySelector('.cart-item-name')?.textContent || '',
                price: `₹${(parseInt(row.getAttribute('data-unit-price') || '0')).toLocaleString('en-IN')}`,
                image: row.querySelector('.cart-item-image')?.getAttribute('src') || '',
                quantity: parseInt(row.querySelector('.quantity-input')?.value || '1')
            }));
            localStorage.setItem('checkoutItems', JSON.stringify(items));
            window.location.href = 'checkout.html';
        });
    }

    // Shop Selected (top action button)
    const shopSelectedTopBtn = document.getElementById('shop-selected');
    if (shopSelectedTopBtn) {
        shopSelectedTopBtn.addEventListener('click', function(e) {
            if (e && e.preventDefault) e.preventDefault();
            const selectedRows = Array.from(document.querySelectorAll('.cart-item'))
                .filter(row => row.querySelector('.item-checkbox')?.classList.contains('checked'));
            if (!selectedRows.length) {
                alert('Please select at least one item to proceed.');
                return;
            }
            const items = selectedRows.map(row => ({
                id: row.getAttribute('data-id'),
                name: row.querySelector('.cart-item-name')?.textContent || '',
                price: `₹${(parseInt(row.getAttribute('data-unit-price') || '0')).toLocaleString('en-IN')}`,
                image: row.querySelector('.cart-item-image')?.getAttribute('src') || '',
                quantity: parseInt(row.querySelector('.quantity-input')?.value || '1')
            }));
            localStorage.setItem('checkoutItems', JSON.stringify(items));
            window.location.href = 'checkout.html';
        });
    }

    updateCartTotal();
}

// Update cart total
function updateCartTotal() {
    const allItems = Array.from(document.querySelectorAll('.cart-item'));
    let subtotal = 0;
    let itemCount = 0;
    
    // Get shopping mode from localStorage
    const shoppingMode = localStorage.getItem('shoppingMode') || 'all';
    const shopNowProductId = localStorage.getItem('shopNowProductId');
    
    // Filter items based on shopping mode
    let items = [];
    if (shoppingMode === 'selected') {
        // If any item checkbox is checked, only total selected items
        const anySelected = Array.from(document.querySelectorAll('.cart-item .item-checkbox')).some(cb => cb.classList.contains('checked'));
        items = anySelected ? allItems.filter(i => i.querySelector('.item-checkbox')?.classList.contains('checked')) : [];
    } else if (shoppingMode === 'single' && shopNowProductId) {
        // If shop now was clicked for a specific product
        items = allItems.filter(i => i.getAttribute('data-id') === shopNowProductId);
    } else {
        // Default: show all items
        items = allItems;
    }
    
    // Update visibility of items in cart summary
    const cartItemsSummary = document.querySelector('.cart-items-summary');
    if (cartItemsSummary) {
        // Clear existing summary items
        cartItemsSummary.innerHTML = '';
        
        // Add only the filtered items to summary
        items.forEach(item => {
            const productId = item.getAttribute('data-id');
            const productName = item.querySelector('.cart-item-name').textContent;
            const productImage = item.querySelector('.cart-item-image').getAttribute('src');
            const unitPrice = parseInt(item.getAttribute('data-unit-price') || '0');
            const quantity = parseInt(item.querySelector('.quantity-input').value) || 1;
            
            const summaryItem = document.createElement('div');
            summaryItem.className = 'cart-item-summary';
            summaryItem.innerHTML = `
                <img src="${productImage}" alt="${productName}" class="item-summary-image">
                <div class="item-summary-details">
                    <h4 class="item-summary-name">${productName}</h4>
                    <div class="item-summary-meta">
                        <span>Qty: ${quantity}</span>
                        <span class="item-summary-price">₹${unitPrice.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            `;
            cartItemsSummary.appendChild(summaryItem);
        });
    }
    
    // Calculate totals
    items.forEach(item => {
        const unitPrice = parseInt(item.getAttribute('data-unit-price') || '0');
        const quantity = parseInt(item.querySelector('.quantity-input').value) || 1;
        const itemTotal = unitPrice * quantity;
        itemCount += quantity;
        const totalEl = item.querySelector('.cart-item-total');
        if (totalEl) totalEl.textContent = '₹' + itemTotal.toLocaleString('en-IN');
        subtotal += itemTotal;
    });
    
    // Update subtotal
    const subtotalEl = document.querySelector('.cart-subtotal');
    if (subtotalEl) subtotalEl.textContent = '₹' + subtotal.toLocaleString('en-IN');
    
    // No GST: set tax to 0
    const tax = 0;
    const taxEl = document.querySelector('.cart-tax');
    if (taxEl) taxEl.textContent = '₹0';
    
    // Calculate total
    const total = subtotal; // No extra charges
    const totalEl = document.querySelector('.cart-total');
    if (totalEl) totalEl.textContent = '₹' + total.toLocaleString('en-IN');

    // Update item count in summary if present
    const summaryLabelEl = document.querySelector('.summary-row:first-child div:first-child');
    if (summaryLabelEl) summaryLabelEl.textContent = `Subtotal (${itemCount} items)`;
}

// Persist current DOM cart back to localStorage
function persistCartFromDOM() {
    const items = document.querySelectorAll('.cart-item');
    const cart = [];
    items.forEach(item => {
        cart.push({
            id: item.getAttribute('data-id'),
            title: item.querySelector('.cart-item-name')?.textContent || '',
            image: item.querySelector('.cart-item-image')?.getAttribute('src') || '',
            price: parseInt(item.getAttribute('data-unit-price') || '0'),
            quantity: parseInt(item.querySelector('.quantity-input')?.value || '1')
        });
    });
    localStorage.setItem('cart', JSON.stringify(cart));
}