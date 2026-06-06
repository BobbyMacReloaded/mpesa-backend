const express = require('express');
const app = express();
app.use(express.json());

// Store payment statuses in memory (use database in production)
const payments = {};

app.get('/', (req, res) => {
    res.send('✅ M-Pesa backend is running!');
});

app.get('/test', (req, res) => {
    res.json({ status: 'ok', message: 'Server is working' });
});

const INTASEND_API_URL = "https://sandbox.intasend.com/api/v1/";
const INTASEND_SECRET_KEY = "ISSecretKey_test_ee130c89-0a4f-43e3-b8f2-017f00dc8117";

app.post('/initiate-payment', async (req, res) => {
    const { phone, amount, orderId } = req.body;
    
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
        
        // Store payment status
        payments[orderId] = {
            tracking_id: data.tracking_id,
            status: 'pending',
            initiated_at: new Date().toISOString()
        };
        
        res.json(data);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/payment-callback', (req, res) => {
    const { invoice } = req.body;
    console.log("Payment callback received:", invoice);
    
    if (invoice && invoice.api_ref) {
        payments[invoice.api_ref] = {
            ...payments[invoice.api_ref],
            status: invoice.state === 'COMPLETE' ? 'success' : 'failed',
            mpesa_receipt: invoice.mpesa_receipt_code,
            completed_at: new Date().toISOString()
        };
    }
    
    res.json({ status: 'ok' });
});

// Add this endpoint for Android to check payment status
app.get('/payment-status/:orderId', (req, res) => {
    const { orderId } = req.params;
    const payment = payments[orderId];
    
    if (payment) {
        res.json({ 
            orderId: orderId,
            status: payment.status,
            tracking_id: payment.tracking_id,
            mpesa_receipt: payment.mpesa_receipt
        });
    } else {
        res.json({ orderId: orderId, status: 'pending' });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
