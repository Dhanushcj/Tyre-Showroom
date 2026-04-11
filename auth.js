document.addEventListener('DOMContentLoaded', async () => {
    
    let users = [];
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            users = await response.json();
            if (users.length === 0) {
                // Seed default
                await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([{ username: 'admin@gmail.com', password: 'admin@123', role: 'admin' }])
                });
                users = [{ username: 'admin@gmail.com', password: 'admin@123', role: 'admin' }];
            }
        }
    } catch (e) {
        console.error("Auth DB check failed.", e);
    }

    // Protection logic for the Dashboard
    if (window.location.pathname.includes('admin-dashboard.html') || window.location.hash !== '') {
        // Just verify pathname to prevent raw access.
        if (sessionStorage.getItem('auth') !== 'true') {
            window.location.replace('admin-login.html');
        }
    }

    // Login Form logic
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const userInput = document.getElementById('admin-id').value;
            const passInput = document.getElementById('admin-password').value;
            const errEl = document.getElementById('login-error');

            const validUser = users.find(u => u.username === userInput && u.password === passInput);
            
            if (validUser) {
                sessionStorage.setItem('auth', 'true');
                window.location.href = 'admin-dashboard.html';
            } else {
                if (errEl) {
                    errEl.innerText = "Invalid credentials. Access denied.";
                    errEl.classList.remove('hidden');
                }
            }
        });
    }

    // Attach to logout buttons
    document.querySelectorAll('a[href="index.html"]').forEach(link => {
        if (link.innerText.includes('Log Out')) {
            link.addEventListener('click', (e) => {
                sessionStorage.removeItem('auth');
            });
        }
    });
});
