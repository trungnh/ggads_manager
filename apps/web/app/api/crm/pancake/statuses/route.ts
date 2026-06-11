import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  // Standard static statuses mapped from Pancake POS platform specification
  const statuses = [
    { id: "0", name: "Mới (New)" },
    { id: "1", name: "Đang xử lý (Processing)" },
    { id: "2", name: "Đã xác nhận (Confirmed)" },
    { id: "3", name: "Chờ chuyển (Awaiting transfer)" },
    { id: "4", name: "Đang đóng gói (Packing)" },
    { id: "5", name: "Đã gửi hàng (Shipped)" },
    { id: "6", name: "Đã hủy (Canceled)" },
    { id: "7", name: "Đã xóa (Deleted)" },
    { id: "8", name: "Thành công / Đã nhận (Delivered / Success)" },
    { id: "9", name: "Đã đối soát (Reconciled)" },
    { id: "10", name: "Đang chuyển hoàn (Returning)" },
    { id: "11", name: "Đã chuyển hoàn (Returned)" },
    { id: "12", name: "Chờ khách nhận (Awaiting customer pickup)" },
    { id: "13", name: "Chờ đối soát (Awaiting reconciliation)" }
  ];

  return NextResponse.json(statuses);
}
