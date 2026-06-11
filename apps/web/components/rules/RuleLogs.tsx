"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function RuleLogs({ adsAccountId }: { adsAccountId: string }) {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // In a real app, you would fetch logs via an API endpoint.
    // For now, we mock it or leave it empty if the endpoint isn't built yet.
    // Assuming an endpoint /api/rules/logs?adsAccountId=... exists
  }, [adsAccountId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nhật ký Thực thi Rule</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Chiến dịch</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                  Chưa có nhật ký nào
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.triggeredAt).toLocaleString('vi-VN')}</TableCell>
                  <TableCell>{log.campaignId}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {log.errorMessage || "Đã thực thi thành công"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
