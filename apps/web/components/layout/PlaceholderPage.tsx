import { auth } from "@/auth";
import { redirect } from "next/navigation";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default async function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)' }}>{title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{description}</p>
      </div>

      <div style={{ 
        background: 'var(--bg-card)', 
        border: '0.5px solid var(--border)', 
        borderRadius: 12, 
        padding: 40,
        textAlign: 'center',
        color: 'var(--text-3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'var(--bg-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24
        }}>
          🚧
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>Tính năng đang được triển khai</h2>
          <p style={{ fontSize: 13 }}>Giao diện và chức năng của trang <strong>{title}</strong> đang được hoàn thiện.</p>
        </div>
      </div>
    </div>
  );
}
