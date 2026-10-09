const express = require('express');
const line = require('@line/bot-sdk');
const cron = require('node-cron');

const app = express();

// 1. นำ Token จาก LINE Developers มาใส่ หรือตั้งใน Environment Variables บน Render
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'tYpAg3lR5yK7Jl79ocuRtgTgqUXRlUguV7Jj/oSvNItz+DuR15EtIjH9nl4yDuFh27TlmICopzG8AFF9kgEpqjbRErwWv/f7WHtjmEZPM2x5dgavh4PoG8GpQiwJ3FNfTIohu54F/4eWrkgCQl8lDQdB04t89/1O/w1cDnyilFU=',
  channelSecret: process.env.CHANNEL_SECRET || 'b1252cb72e130eddd38bc5423663d3b0'
};

const client = new line.Client(config);

// 2. จำลองฐานข้อมูลลูกค้า (ในอนาคตสามารถเชื่อมฐานข้อมูลจริงได้)
let customers = [
  {
    line_user_id: 'U4af4980629...', // แทนที่ด้วย User ID จริงของคุณเพื่อทดสอบ
    customer_name: 'ลูกค้าท่านที่ 1',
    expire_date: '2026-10-12',
    payment_status: 'pending', // active = จ่ายแล้ว, pending = รอชำระ
    amount: 59
  }
];

// 3. ฟังก์ชันสร้าง Flex Message แจ้งเตือนต่ออายุ
function getRenewalFlex(customer, daysLeft) {
  return {
    type: 'flex',
    altText: '⏰ แจ้งเตือนต่ออายุ YouTube Premium',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '⏰ แจ้งเตือนต่ออายุแพ็กเกจ', weight: 'bold', color: '#E50914', size: 'md' },
          { type: 'text', text: `เรียนคุณ ${customer.customer_name} รอบบิลใกล้หมดอายุแล้ว`, size: 'sm', color: '#666666', margin: 'md' },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  { type: 'text', text: 'บริการ', color: '#aaaaaa', size: 'sm', flex: 3 },
                  { type: 'text', text: 'YouTube Premium', color: '#333333', size: 'sm', flex: 6, weight: 'bold' }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  { type: 'text', text: 'ครบกำหนด', color: '#aaaaaa', size: 'sm', flex: 3 },
                  { type: 'text', text: `${customer.expire_date} (อีก ${daysLeft} วัน)`, color: '#FF5555', size: 'sm', flex: 6, weight: 'bold' }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  { type: 'text', text: 'ยอดชำระ', color: '#aaaaaa', size: 'sm', flex: 3 },
                  { type: 'text', text: `${customer.amount} บาท`, color: '#333333', size: 'sm', flex: 6, weight: 'bold' }
                ]
              }
            ]
          },
          { type: 'separator', margin: 'lg' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#E50914',
            action: {
              type: 'uri',
              label: 'แจ้งโอนเงินต่ออายุ',
              uri: 'https://coolkizstation-renewed-apppre.ksmqx.com/'
            }
          }
        ]
      }
    }
  };
}

// 4. ฟังก์ชันสร้าง Flex Message แจ้งเตือนเลยกำหนด
function getOverdueFlex(customer, overdueDays) {
  return {
    type: 'flex',
    altText: '🚨 แจ้งเตือนเลยกำหนดชำระ YouTube Premium',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '🚨 แจ้งเตือนเลยกำหนดชำระ', weight: 'bold', color: '#CC0000', size: 'md' },
          { type: 'text', text: `เลยกำหนดมาแล้ว ${overdueDays} วัน กรุณาต่ออายุเพื่อไม่ให้สิทธิ์หลุด`, size: 'sm', color: '#666666', wrap: true, margin: 'md' },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  { type: 'text', text: 'บริการ', color: '#aaaaaa', size: 'sm', flex: 3 },
                  { type: 'text', text: 'YouTube Premium', color: '#333333', size: 'sm', flex: 6, weight: 'bold' }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  { type: 'text', text: 'สถานะ', color: '#aaaaaa', size: 'sm', flex: 3 },
                  { type: 'text', text: `เลยกำหนด ${overdueDays} วัน`, color: '#CC0000', size: 'sm', flex: 6, weight: 'bold' }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  { type: 'text', text: 'ยอดชำระ', color: '#aaaaaa', size: 'sm', flex: 3 },
                  { type: 'text', text: `${customer.amount} บาท`, color: '#333333', size: 'sm', flex: 6, weight: 'bold' }
                ]
              }
            ]
          },
          { type: 'separator', margin: 'lg' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#CC0000',
            action: {
              type: 'uri',
              label: 'ชำระเงินด่วนเพื่อต่อสิทธิ์',
              uri: 'https://coolkizstation-renewed-apppre.ksmqx.com/'
            }
          }
        ]
      }
    }
  };
}

// 5. Endpoint สำหรับ Webhook (ดักจับ User ID อัตโนมัติเมื่อลูกค้าพิมพ์แชทมา)
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  // บันทึก User ID ลงคอนโซลเมื่อมีลูกค้าทักมา
  if (event.source && event.source.userId) {
    console.log(`[Webhook Event] พบ LINE User ID: ${event.source.userId}`);
  }
  return Promise.resolve(null);
}

// 6. ฟังก์ชันตรวจเช็กรายวัน
async function checkDailySubscriptions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const customer of customers) {
    // ถ้าชำระเงินแล้ว (active) จะไม่ส่งข้อความใดๆ
    if (customer.payment_status === 'active') continue;

    const expireDate = new Date(customer.expire_date);
    expireDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24));
    let msg = null;

    if (diffDays === 3 || diffDays === 1 || diffDays === 0) {
      msg = getRenewalFlex(customer, Math.max(0, diffDays));
    } else if (diffDays < 0) {
      msg = getOverdueFlex(customer, Math.abs(diffDays));
    }

    if (msg) {
      try {
        await client.pushMessage(customer.line_user_id, msg);
        console.log(`ส่งการ์ดแจ้งเตือนหา ${customer.customer_name} เรียบร้อย`);
      } catch (e) {
        console.error(`ส่งไม่สำเร็จ: ${e.message}`);
      }
    }
  }
}

// 7. ตั้งเวลาตรวจสอบทุกวันเวลา 09:00 น.
cron.schedule('0 9 * * *', () => {
  console.log('เริ่มรันระบบตรวจเช็กแจ้งเตือนรอบเช้า...');
  checkDailySubscriptions();
});

// เปิดเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
