import random
from locust import HttpUser, task, between

class ECommerceUser(HttpUser):
    # Think time between tasks (simulate real user delay)
    wait_time = between(1, 3)
    
    token = None
    user_email = None

    def on_start(self):
        """Executed when a simulated user starts."""
        self.login()

    def login(self):
        # Generate random user details or log in with the default seeded user
        self.user_email = "anji@gmail.com"
        payload = {
            "username": self.user_email,
            "password": "password123"
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        response = self.client.post("/auth/login", data=payload, headers=headers)
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})

    @task(3)
    def browse_products(self):
        """Simulate browsing all products."""
        self.client.get("/products?limit=12")

    @task(4)
    def search_products(self):
        """Simulate typing in the debounced search bar."""
        queries = ["laptop", "mouse", "keyboard", "phone", "book"]
        query = random.choice(queries)
        self.client.get(f"/products?search={query}&limit=12")

    @task(2)
    def view_product_details(self):
        """Simulate clicking a product to view details."""
        # Query product IDs between 1 and 20 (standard seeded items)
        product_id = random.randint(1, 20)
        self.client.get(f"/products/{product_id}")

    @task(1)
    def add_to_cart_and_checkout(self):
        """Simulate the checkout process."""
        if not self.token:
            return
            
        product_id = random.randint(1, 20)
        
        # 1. Add item to cart
        cart_payload = {
            "product_id": product_id,
            "quantity": 1
        }
        self.client.post("/cart", json=cart_payload)
        
        # 2. View cart
        self.client.get("/cart")
        
        # 3. Place order
        order_payload = {
            "shipping_address": "123 Test Street, Hyderabad",
            "payment_method": "credit_card"
        }
        self.client.post("/orders", json=order_payload)
