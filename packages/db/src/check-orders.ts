async function checkOrders() {
  const shopId = "20021288";
  const apiKey = "44386cc879804351b5ba8c4b878702d2";
  const productId = "b6679d28-619e-4e2b-92eb-d63b80b377e1"; // Rootking product ID
  
  const startTs = Math.floor(Date.UTC(2026, 4, 1, 0, 0, 0) / 1000);
  const endTs = Math.floor(Date.UTC(2026, 4, 23, 23, 59, 59) / 1000);

  const url = `https://pos.pancake.vn/api/v1/shops/${shopId}/orders?api_key=${apiKey}&startDateTime=${startTs}&endDateTime=${endTs}&page=1&page_size=50&product_id[]=${productId}`;
  console.log("Fetching orders from url:", url);

  try {
    const res = await fetch(url);
    const data = await res.json();
    const orders = data.data || [];
    console.log(`Fetched ${orders.length} orders for Rootking in May 2026.`);
    
    if (orders.length > 0) {
      orders.forEach((o: any, idx: number) => {
        console.log(`Order[${idx}] - ID: ${o.id}, Phone: ${o.bill_phone_number}, Total: ${o.total_price}, Status: ${o.status}`);
        if (o.items) {
          o.items.forEach((item: any) => {
            console.log(`  Item: ${item.product_id} | name: ${item.variation_info?.name} | display_id: ${item.variation_info?.display_id} | qty: ${item.quantity}`);
          });
        }
      });
    }
  } catch (err) {
    console.error("Error checking orders:", err);
  }
}

checkOrders();
