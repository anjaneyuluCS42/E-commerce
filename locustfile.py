import random
import uuid
from locust import HttpUser, task, between


class ShopHubUser(HttpUser):
    # Simulates user think time between actions (1 to 3 seconds)
    wait_time = between(1, 3)

    def on_start(self):
        """
        Runs when a simulated user starts.
        Registers a new user, extracts the verification token, verifies, and logs in.
        """
        self.username = f"locust_{uuid.uuid4().hex[:8]}"
        self.email = f"{self.username}@example.com"
        self.password = "LocustSecure123!"
        self.headers = {}
        self.user_id = None

        # 1. Register User
        reg_payload = {
            "username": self.username,
            "email": self.email,
            "password": self.password,
        }
        with self.client.post(
            "/auth/register", json=reg_payload, catch_response=True
        ) as resp:
            if resp.status_code == 200:
                resp_json = resp.json()
                # If local SMTP is not configured, we get a test verification URL
                test_url = resp_json.get("test_verification_url")
                if test_url and "?token=" in test_url:
                    token = test_url.split("?token=")[1]
                    # Verify user email
                    self.client.get(f"/auth/verify?token={token}")
                resp.success()
            else:
                # If random registration fails, fallback to seeded user
                self.email = "anji@gmail.com"
                self.password = "123456"

        # 2. Login User
        login_data = {"username": self.email, "password": self.password}
        with self.client.post(
            "/auth/login", data=login_data, catch_response=True
        ) as resp:
            if resp.status_code == 200:
                token_data = resp.json()
                access_token = token_data.get("access_token")
                self.headers = {"Authorization": f"Bearer {access_token}"}
                resp.success()
            else:
                resp.failure(
                    f"Failed to log in as {self.email}: {resp.status_code} - {resp.text}"
                )

    @task(5)
    def browse_products(self):
        """
        Browse the main catalog page with default parameters.
        """
        self.client.get("/products")

    @task(3)
    def search_products(self):
        """
        Search for products using keywords.
        """
        search_terms = ["Dell", "Processor", "Book", "Fashion", "Laptop", "Kitchen"]
        term = random.choice(search_terms)
        self.client.get(f"/products?search={term}")

    @task(3)
    def filter_products(self):
        """
        Filter products by category and price range.
        """
        category_id = random.randint(1, 6)
        self.client.get(f"/products?category_id={category_id}&min_price=100")

    @task(4)
    def view_product_details(self):
        """
        View details of a random product.
        """
        product_id = random.randint(1, 20)
        self.client.get(f"/products/{product_id}")

    @task(2)
    def cart_operations(self):
        """
        Add an item to the cart, retrieve the cart, and then clear it.
        """
        product_id = random.randint(1, 20)
        # Add to cart
        self.client.post(
            f"/cart/add/{product_id}?quantity=1", headers=self.headers
        )
        # View cart
        self.client.get("/cart/", headers=self.headers)

    @task(1)
    def checkout_simulation(self):
        """
        Simulate full checkout: Add item, checkout, and place order.
        """
        product_id = random.randint(1, 10)
        # 1. Add item to cart
        self.client.post(
            f"/cart/add/{product_id}?quantity=1", headers=self.headers
        )

        # 2. Perform checkout
        checkout_payload = {
            "shipping_address": "123 Locust Performance St, Load Test City",
            "payment_method": "Cash on Delivery",
            "coupon_code": "WELCOME10",
        }
        self.client.post(
            "/orders/checkout", json=checkout_payload, headers=self.headers
        )
