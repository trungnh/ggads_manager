"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RuleForm({ adsAccountId, onSuccess }: { adsAccountId: string, onSuccess?: () => void }) {
  const [name, setName] = useState('');
  const [metric, setMetric] = useState('real_cpa');
  const [operator, setOperator] = useState('gt');
  const [value, setValue] = useState('');
  const [actionType, setActionType] = useState('pause_campaign');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        adsAccountId,
        name,
        targetCampaignIds: ['ALL'],
        conditions: [{ metric, operator, value: Number(value) }],
        actions: [{ type: actionType, value: null }],
        executionIntervalMinutes: 5
      };

      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (onSuccess) onSuccess();
        setName('');
        setValue('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tạo Rule Tự Động Hóa</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tên Rule</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Tắt nếu CPA > 100k" required />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm font-medium">Nếu (Metric)</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={metric} onChange={e => setMetric(e.target.value)}>
                <option value="real_cpa">CPA Thực Tế</option>
                <option value="budget_spent_pct">% Ngân sách đã chi</option>
                <option value="real_roas">ROAS Thực Tế</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Điều kiện</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={operator} onChange={e => setOperator(e.target.value)}>
                <option value="gt">Lớn hơn (&gt;)</option>
                <option value="lt">Nhỏ hơn (&lt;)</option>
                <option value="eq">Bằng (=)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Giá trị</label>
              <Input type="number" value={value} onChange={e => setValue(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Thì (Hành động)</label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={actionType} onChange={e => setActionType(e.target.value)}>
              <option value="pause_campaign">Tạm dừng chiến dịch</option>
              <option value="start_campaign">Bật chiến dịch</option>
              <option value="send_telegram">Gửi cảnh báo Telegram</option>
            </select>
          </div>

          <Button type="submit">Lưu Rule</Button>
        </form>
      </CardContent>
    </Card>
  );
}
