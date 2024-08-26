const express = require('express'); // Express framework สำหรับสร้างแอปพลิเคชันเว็บ
const mysql = require('mysql2'); // โมดูลสำหรับเชื่อมต่อกับฐานข้อมูล MySQL
const bcrypt = require('bcrypt');  // โมดูลสำหรับการเข้ารหัสรหัสผ่าน
const https = require('https');  // โมดูลสำหรับสร้างเซิร์ฟเวอร์ HTTPS
const fs = require('fs'); // โมดูลสำหรับทำงานกับระบบไฟล์
const session = require('express-session'); // โมดูลสำหรับจัดการเซสชัน
const helmet = require('helmet'); // โมดูลสำหรับเพิ่มความปลอดภัยของ HTTP headers

const app = express(); // สร้างอินสแตนซ์ของแอป Express
const port = 3000; // กำหนดพอร์ตที่เซิร์ฟเวอร์จะฟัง

// อ่านใบรับรอง SSL และคีย์ส่วนตัว
const options = {
    key: fs.readFileSync('cert/key.pem'),    // อ่านคีย์ส่วนตัวจากไฟล์สำหรับการเข้ารหัส SSL
    cert: fs.readFileSync('cert/cert.pem')   // อ่านใบรับรอง SSL จากไฟล์
};

// ตั้งค่าการเชื่อมต่อฐานข้อมูล MySQL
const db = mysql.createConnection({
    host: "localhost",         // โฮสต์ของฐานข้อมูล MySQL
    user: "root",              // ชื่อผู้ใช้สำหรับเชื่อมต่อฐานข้อมูล
    password: "1234",          // รหัสผ่านสำหรับเชื่อมต่อฐานข้อมูล
    database: "shopdee"        // ชื่อฐานข้อมูลที่ต้องการใช้
});

// เชื่อมต่อกับฐานข้อมูลและจัดการข้อผิดพลาด
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err); // แสดงข้อผิดพลาดถ้าการเชื่อมต่อล้มเหลว
        process.exit(1);  // หยุดการทำงานของแอปพลิเคชัน
    }
    console.log('Connected to the database');  // แสดงข้อความเมื่อเชื่อมต่อฐานข้อมูลสำเร็จ
});

// ตั้งค่า middleware เพื่อเพิ่มความปลอดภัยและจัดการ JSON และ URL-encoded data
app.use(helmet()); // ใช้ helmet สำหรับการเพิ่มความปลอดภัยของ HTTP headers
app.use(express.json()); // ใช้ middleware สำหรับจัดการกับ JSON ที่ส่งมาจากลูกค้า
app.use(express.urlencoded({ extended: true })); // ใช้ middleware สำหรับจัดการกับข้อมูลที่เข้ารหัสแบบ URL

// ตั้งค่าเซสชัน
app.use(session({
    secret: 'your-secret-key',  // รหัสลับที่ใช้สำหรับเข้ารหัสข้อมูลเซสชัน (ควรเปลี่ยนเป็นรหัสลับที่ปลอดภัย)
    resave: false,              // ไม่ให้เซสชันถูกบันทึกซ้ำทุกครั้งที่มีการเปลี่ยนแปลง
    saveUninitialized: true,    // บันทึกเซสชันที่ยังไม่ได้ใช้งาน (เซสชันใหม่)
    cookie: { secure: true }    // ใช้ HTTPS สำหรับคุกกี้เซสชัน (กำหนดเป็น true เมื่อใช้ HTTPS)
}));

// เส้นทางสำหรับเพิ่มข้อมูลสินค้าใหม่
app.post('/product', (req, res) => {
    const { productName, productDetail, price, cost, quantity } = req.body; // ดึงข้อมูลสินค้าจากคำขอ
    const sql = "INSERT INTO product (productName, productDetail, price, cost, quantity) VALUES (?, ?, ?, ?, ?)"; // คำสั่ง SQL สำหรับเพิ่มข้อมูลสินค้า
    const values = [productName, productDetail, price, cost, quantity]; // ค่าที่จะใช้ในการเพิ่มข้อมูล

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error inserting product:', err); // บันทึกข้อผิดพลาด
            return res.status(500).json({'message': 'เกิดข้อผิดพลาดในการเพิ่มข้อมูลสินค้า', 'status': false}); // ส่งข้อผิดพลาดหากเกิดข้อผิดพลาดในการเพิ่มข้อมูล
        }
        res.status(201).json({'message': 'บันทึกข้อมูลสินค้าเรียบร้อยแล้ว', 'status': true}); // ส่งข้อความยืนยันเมื่อเพิ่มข้อมูลสำเร็จ
    });
});

// เส้นทางสำหรับดึงข้อมูลสินค้าตาม ID
app.get('/product/:id', (req, res) => {
    const productID = req.params.id; // ดึง ID ของสินค้าจากพารามิเตอร์ใน URL
    const sql = "SELECT * FROM product WHERE productID = ?"; // คำสั่ง SQL สำหรับดึงข้อมูลสินค้าตาม ID

    db.query(sql, [productID], (err, result) => {
        if (err) {
            console.error('Error retrieving product:', err); // บันทึกข้อผิดพลาด
            return res.status(500).json({'message': 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า', 'status': false}); // ส่งข้อผิดพลาดหากเกิดข้อผิดพลาดในการดึงข้อมูล
        }
        if (result.length > 0) {
            res.json(result[0]); // ส่งข้อมูลสินค้าถ้ามีข้อมูล
        } else {
            res.status(404).json({'message': 'ไม่พบข้อมูลสินค้า', 'status': false}); // ส่งข้อผิดพลาดหากไม่พบข้อมูล
        }
    });
});

// เส้นทางสำหรับเข้าสู่ระบบผู้ใช้
app.post('/login', async (req, res) => {
    const { username, password } = req.body; // ดึงชื่อผู้ใช้และรหัสผ่านจากคำขอ
    const sql = "SELECT * FROM customer WHERE username = ? AND isActive = 1"; // คำสั่ง SQL สำหรับค้นหาผู้ใช้ที่มีชื่อผู้ใช้และสถานะเป็น 1 (ใช้งานอยู่)

    db.query(sql, [username], async (err, result) => {
        if (err) {
            console.error('Error during login:', err); // บันทึกข้อผิดพลาด
            return res.send({'message': 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'status': false}); // ส่งข้อผิดพลาดหากเกิดข้อผิดพลาดในการเข้าสู่ระบบ
        }
        if (result.length > 0) {
            const customer = result[0]; // ดึงข้อมูลลูกค้าจากผลลัพธ์
            const match = await bcrypt.compare(password, customer.password); // เปรียบเทียบรหัสผ่านที่ป้อนเข้ามากับรหัสผ่านที่เข้ารหัสในฐานข้อมูล

            if (match) {
                req.session.userId = customer.customerID; // เก็บ customerID ในเซสชันเพื่อใช้ในการติดตามสถานะการเข้าสู่ระบบ
                customer['message'] = "เข้าสู่ระบบสำเร็จ"; // เพิ่มข้อความยืนยันเข้าสู่ระบบสำเร็จ
                customer['status'] = true; // ตั้งสถานะเป็น true
                res.json(customer); // ส่งข้อมูลผู้ใช้ไปยังลูกค้า
            } else {
                res.send({"message": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "status": false}); // ส่งข้อผิดพลาดถ้ารหัสผ่านไม่ตรง
            }
        } else {
            res.send({"message": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "status": false}); // ส่งข้อผิดพลาดถ้าผู้ใช้ไม่พบ
        }
    });
});

// เริ่มเซิร์ฟเวอร์ HTTPS
https.createServer(options, app).listen(port, () => {
    console.log(`HTTPS server listening on port ${port}`); // แสดงข้อความเมื่อเซิร์ฟเวอร์เริ่มทำงานและฟังที่พอร์ตที่กำหนด
});
