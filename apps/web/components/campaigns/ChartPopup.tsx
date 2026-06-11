"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartPopupProps {
  campaignId: string;
  campaignName: string;
  customerId: string;
  children: React.ReactNode;
}

export function ChartPopup({ campaignId, campaignName, customerId, children }: ChartPopupProps) {
  const [data, setData] = useState<any[]>([]);
  const [granularity, setGranularity] = useState<'5m' | '30m'>('30m');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchChartData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/campaigns/${customerId}/${campaignId}/chart?granularity=${granularity}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [isOpen, granularity, campaignId, customerId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Biểu đồ hiệu suất: {campaignName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex justify-between items-center mb-4">
          <Tabs value={granularity} onValueChange={(v) => setGranularity(v as '5m' | '30m')}>
            <TabsList>
              <TabsTrigger value="5m">5 Phút</TabsTrigger>
              <TabsTrigger value="30m">30 Phút</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
 
        <div className="h-[400px] w-full">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center">Đang tải dữ liệu...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }} 
                  tickMargin={10} 
                />
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  stroke="#8884d8"
                  tickFormatter={(val) => new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(val)}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#82ca9d" 
                />
                <Tooltip 
                  formatter={(value: any, name: any) => {
                    if (name === 'Chi phí') return [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0)), name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="cost" 
                  name="Chi phí" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="conversions" 
                  name="Chuyển đổi" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
