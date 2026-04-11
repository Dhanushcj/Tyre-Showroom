document.addEventListener('DOMContentLoaded', async () => {
    
    let users = [];
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            users = await response.json();
            
            // Check if our specific admin@gmail.com exists
            const hasNewAdmin = users.some(u => u.username === 'admin@gmail.com');
            
            if (!hasNewAdmin) {
                // If it doesn't exist, we add it. 
                // We also filter out any OLD legacy 'admin' username to prevent confusion
                const updatedUsers = users.filter(u => u.username !== 'admin');
                updatedUsers.push({ username: 'admin@gmail.com', password: 'admin@123', role: 'admin' });
                
                await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedUsers)
                });
                users = updatedUsers;
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
