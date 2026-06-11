import NewAccountPageClient from './NewAccountPageClient';
import { Suspense } from 'react';

export default async function NewAccountPage() {
  return (
    <Suspense fallback={<div style={{ padding: 100, textAlign: 'center' }}>Đang tải dữ liệu...</div>}>
      <NewAccountPageClient />
    </Suspense>
  );
}
