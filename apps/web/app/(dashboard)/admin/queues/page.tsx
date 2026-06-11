import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, Server } from "lucide-react";
import { Queue } from "bullmq";
import Redis from "ioredis";

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const ruleQueue = new Queue('RuleEvaluationQueue', { connection: redisConnection });
const notifQueue = new Queue('NotificationQueue', { connection: redisConnection });
const revQueue = new Queue('RevenueQueue', { connection: redisConnection });

export default async function AdminQueuesPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
    redirect("/");
  }

  const getQueueStats = async (queue: Queue) => {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);
    return { name: queue.name, waiting, active, completed, failed, delayed };
  };

  const stats = await Promise.all([
    getQueueStats(ruleQueue),
    getQueueStats(notifQueue),
    getQueueStats(revQueue)
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Giám sát Hàng đợi (Queues)</h1>
          <p className="text-gray-500">Trạng thái thời gian thực của BullMQ Workers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(stat => (
          <Card key={stat.name} className="border-blue-100">
            <CardHeader className="bg-blue-50/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="w-5 h-5 text-blue-600" />
                {stat.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Đang chạy (Active)</span>
                  <Badge className="bg-blue-600">{stat.active}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Đang chờ (Waiting)</span>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">{stat.waiting}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Hẹn giờ (Delayed)</span>
                  <Badge variant="outline" className="text-purple-600 border-purple-600">{stat.delayed}</Badge>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Thành công (Completed)</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">{stat.completed}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Thất bại (Failed)</span>
                  <Badge variant="destructive">{stat.failed}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
