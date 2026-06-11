async function testPancake() {
  const shopId = "20021288";
  const apiKey = "44386cc879804351b5ba8c4b878702d2"; // Correct API key
  const sku = "rootking";

  console.log("=== Fetching product by SKU ===");
  try {
    const url = `https://pos.pancake.vn/api/v1/shops/${shopId}/products/${sku}?api_key=${apiKey}`;
    console.log("URL:", url);
    const res = await fetch(url);
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error fetching SKU product:", err);
  }

  console.log("\n=== Fetching all products list ===");
  try {
    const url = `https://pos.pancake.vn/api/v1/shops/${shopId}/products?api_key=${apiKey}&page=1&page_size=50`;
    const res = await fetch(url);
    const data = await res.json();
    console.log("All products list size:", data.data?.length);
    if (data.data) {
      data.data.forEach((p: any) => {
        console.log(`Product - ID: ${p.id}, Name: ${p.name}, SKU: ${p.sku}`);
        if (p.variations) {
          p.variations.forEach((v: any) => {
            console.log(`  Variation - ID: ${v.id}, Name: ${v.name}, SKU: ${v.sku}, Import Price: ${v.last_imported_price}`);
          });
        }
      });
    }
  } catch (err) {
    console.error("Error fetching products list:", err);
  }
}

testPancake();
