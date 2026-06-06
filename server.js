const express = require('express');
const app = express();
app.use(express.json());
// Add this at the top, before other routes
app.get('/', (req, res) => {
    res.send('✅ M-Pesa backend is running!');
});

// Also add a test endpoint
app.get('/test', (req, res) => {
    res.json({ status: 'ok', message: 'Server is working' });
});
const INTASEND_API_URL = "https://sandbox.intasend.com/api/v1/";
const INTASEND_SECRET_KEY = "ISSecretKey_test_ee130c89-0a4f-43e3-b8f2-017f00dc8117"; // ← Replace with your key

// Endpoint your Android app will call
app.post('/initiate-payment', async (req, res) => {
    const { phone, amount, orderId } = req.body;
    
    // Format phone number (07XX → 2547XX)
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
    }

    try {
        const response = await fetch(`${INTASEND_API_URL}payment/mpesa-stk-push/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${INTASEND_SECRET_KEY}`
            },
            body: JSON.stringify({
                phone_number: formattedPhone,
                email: "customer@example.com",
                amount: amount,
                narrative: `Order ${orderId}`,
                api_ref: orderId,
                currency: "KES"
            })
        });

        const data = await response.json();
        console.log("IntaSend response:", data);
        res.json(data);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Callback endpoint where IntaSend sends payment results
app.post('/payment-callback', (req, res) => {
    const { invoice } = req.body;
    console.log("Payment callback received:", invoice);
    
    // invoice.state will be "COMPLETE" or "FAILED"
    // invoice.api_ref is your orderId
    // TODO: Update your Supabase orders table here
    
    res.json({ status: 'ok' });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
