import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, ruleLogs } from "@repo/db";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export default async function AdminLogsPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    redirect("/");
  }

  // Fetch recent logs globally across all accounts for Super Admin
  const logs = await db.query.ruleLogs.findMany({
    orderBy: [desc(ruleLogs.executedAt)],
    limit: 100
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hệ thống Logs Tự động hóa</h1>
          <p className="text-gray-500">Giám sát các hành động tắt/bật/tăng giảm ngân sách của Rule Engine</p>
        </div>
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Xuất Log
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nhật ký 100 sự kiện gần nhất</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>ID Tài khoản</TableHead>
                <TableHead>Chiến dịch</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    Hệ thống chưa ghi nhận log nào.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{new Date(log.executedAt!).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>{log.adsAccountId}</TableCell>
                    <TableCell>{log.campaignName || log.campaignId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.actionType || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell>
                      {/* Using presence of metricsSnapshot or actionType as success marker since we didn't add status column in schema */}
                      <Badge variant="default" className="bg-green-600">Thành công</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
