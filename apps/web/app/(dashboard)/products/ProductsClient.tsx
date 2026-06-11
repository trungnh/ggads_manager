"use client";

import * as React from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2, 
  X, 
  AlertCircle, 
  Check,
  Percent,
  TrendingUp,
  TrendingDown,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

interface AdsAccount {
  id: string;
  name: string | null;
  customerId: string;
  status: string | null;
}

interface Product {
  id: string;
  userId: string | null;
  code: string;
  name: string;
  shippingFee: string | null;
  importPriceMicros: string | null;
  sellingPriceMicros: string | null;
  returnRate: string | null;
  keywordCampaign: string | null;
  adsAccountIds: any; // jsonb array of customerIds
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ProductsClientProps {
  initialProducts: Product[];
  adsAccounts: AdsAccount[];
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

export function ProductsClient({ initialProducts, adsAccounts }: ProductsClientProps) {
  const [productsList, setProductsList] = React.useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  
  // Selected product for edit/delete
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  
  // Form states
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [importPrice, setImportPrice] = React.useState(""); // VND
  const [sellingPrice, setSellingPrice] = React.useState(""); // VND
  const [shippingFee, setShippingFee] = React.useState(""); // VND
  const [returnRate, setReturnRate] = React.useState(""); // Percentage (e.g. 15 for 15%)
  const [keywordCampaign, setKeywordCampaign] = React.useState("");
  const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([]); // Array of customerIds
  
  // Loading & Toasts
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  // Show Toast helper
  const showToast = React.useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Convert Ads Accounts to options for MultiSelect
  const adsOptions = React.useMemo(() => {
    return adsAccounts.map(acc => ({
      label: acc.name || `Tài khoản ${acc.customerId}`,
      value: acc.customerId,
      customerId: acc.customerId
    }));
  }, [adsAccounts]);

  // Filter products by query
  const filteredProducts = React.useMemo(() => {
    if (!searchQuery.trim()) return productsList;
    const q = searchQuery.toLowerCase();
    return productsList.filter(p => 
      p.code.toLowerCase().includes(q) || 
      p.name.toLowerCase().includes(q) ||
      (p.keywordCampaign && p.keywordCampaign.toLowerCase().includes(q))
    );
  }, [productsList, searchQuery]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setCode("");
    setName("");
    setImportPrice("");
    setSellingPrice("");
    setShippingFee("");
    setReturnRate("");
    setKeywordCampaign("");
    setSelectedAccountIds([]);
    setIsCreateOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setCode(product.code);
    setName(product.name);
    // Convert micros back to standard VND for editing
    setImportPrice(String(Number(product.importPriceMicros || 0) / 1000000));
    setSellingPrice(String(Number(product.sellingPriceMicros || 0) / 1000000));
    setShippingFee(String(Number(product.shippingFee || 0) / 1000000));
    // Convert decimal return rate back to percentage (e.g. 0.1500 -> 15)
    setReturnRate(String(Number(product.returnRate || 0) * 100));
    setKeywordCampaign(product.keywordCampaign || "");
    
    // Parse adsAccountIds
    let mappedIds: string[] = [];
    if (Array.isArray(product.adsAccountIds)) {
      mappedIds = product.adsAccountIds;
    } else if (typeof product.adsAccountIds === "string") {
      try {
        mappedIds = JSON.parse(product.adsAccountIds);
      } catch (e) {
        mappedIds = [];
      }
    }
    setSelectedAccountIds(mappedIds);
    setIsEditOpen(true);
  };

  // Open Delete Dialog
  const handleOpenDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      showToast("Vui lòng điền đầy đủ mã và tên sản phẩm.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate micros (Value * 1,000,000)
      const importPriceMicros = Number(importPrice || 0) * 1000000;
      const sellingPriceMicros = Number(sellingPrice || 0) * 1000000;
      const shippingFeeMicros = Number(shippingFee || 0) * 1000000;
      // Convert percentage rate to decimal (15% -> 0.15)
      const decimalReturnRate = Number(returnRate || 0) / 100;

      const payload = {
        code: code.trim(),
        name: name.trim(),
        importPriceMicros,
        sellingPriceMicros,
        shippingFee: shippingFeeMicros,
        returnRate: decimalReturnRate,
        keywordCampaign: keywordCampaign.trim() || null,
        adsAccountIds: selectedAccountIds
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Lỗi khi thêm sản phẩm");
      }

      const data = await res.json();
      setProductsList(prev => [data.product, ...prev]);
      setIsCreateOpen(false);
      showToast(`Đã thêm sản phẩm "${payload.name}" thành công.`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Lỗi hệ thống khi thêm sản phẩm", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!code.trim() || !name.trim()) {
      showToast("Vui lòng điền đầy đủ mã và tên sản phẩm.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate micros
      const importPriceMicros = Number(importPrice || 0) * 1000000;
      const sellingPriceMicros = Number(sellingPrice || 0) * 1000000;
      const shippingFeeMicros = Number(shippingFee || 0) * 1000000;
      // Convert percentage rate to decimal
      const decimalReturnRate = Number(returnRate || 0) / 100;

      const payload = {
        code: code.trim(),
        name: name.trim(),
        importPriceMicros,
        sellingPriceMicros,
        shippingFee: shippingFeeMicros,
        returnRate: decimalReturnRate,
        keywordCampaign: keywordCampaign.trim() || null,
        adsAccountIds: selectedAccountIds
      };

      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Lỗi khi cập nhật sản phẩm");
      }

      const data = await res.json();
      setProductsList(prev => 
        prev.map(p => p.id === selectedProduct.id ? data.product : p)
      );
      setIsEditOpen(false);
      showToast(`Đã cập nhật sản phẩm "${payload.name}" thành công.`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Lỗi hệ thống khi cập nhật", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Lỗi khi xóa sản phẩm");
      }

      setProductsList(prev => prev.filter(p => p.id !== selectedProduct.id));
      setIsDeleteOpen(false);
      showToast(`Đã xóa sản phẩm "${selectedProduct.name}" thành công.`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Lỗi hệ thống khi xóa sản phẩm", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center justify-between p-4 rounded-lg shadow-lg border transition-all duration-300 transform translate-y-0 opacity-100 pointer-events-auto ${
              toast.type === "success" 
                ? "bg-ads-green-bg border-ads-green-border text-ads-green-text" 
                : "bg-ads-red-bg border-ads-red-border text-ads-red-text"
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs font-semibold">{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)} 
              className="p-1 hover:opacity-75 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-semibold text-text-1">Quản lý Sản phẩm & Giá vốn</h1>
          <p className="text-xs text-text-3 mt-1">
            Thiết lập giá nhập, chi phí ship và tỷ lệ hoàn của từng sản phẩm. Ánh xạ các tài khoản quảng cáo để tự động đo lường doanh thu và phân tích PnL.
          </p>
        </div>
        <Button 
          onClick={handleOpenCreate} 
          className="bg-text-1 hover:bg-text-1/90 text-bg-card font-medium text-xs px-4 py-2 flex items-center gap-2 rounded-lg cursor-pointer h-9 shrink-0 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Thêm Sản phẩm
        </Button>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-3">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          placeholder="Tìm kiếm sản phẩm theo mã, tên..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring text-text-1 transition-all"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery("")} 
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-3 hover:text-text-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Table Container */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-secondary/40 border-b border-border text-left">
                <th className="py-3 px-4 text-[10px] font-bold text-text-3 uppercase tracking-wider">Mã sản phẩm</th>
                <th className="py-3 px-4 text-[10px] font-bold text-text-3 uppercase tracking-wider">Tên sản phẩm</th>
                <th className="py-3 px-4 text-[10px] font-bold text-text-3 uppercase tracking-wider text-right">Giá nhập</th>
                <th className="py-3 px-4 text-[10px] font-bold text-text-3 uppercase tracking-wider text-right">Giá bán</th>
                <th className="py-3 px-4 text-[10px] font-bold text-text-3 uppercase tracking-wider text-right">Phí Ship</th>
                <th className="py-3 px-4 text-[10px] font-bold text-text-3 uppercase tracking-wider text-center">% Hoàn</th>
                <th className="py-3 px-4 text-[10px] font-bold text-text-3 uppercase tracking-wider">Tài khoản Ads mapped</th>
                <th className="py-3 px-4 text-[10px] font-bold text-text-3 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-3 text-sm font-medium">
                    Chưa có sản phẩm nào phù hợp với tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  // Format numbers safely by dividing micros by 1,000,000
                  const importPrice = Number(product.importPriceMicros || 0) / 1000000;
                  const sellingPrice = Number(product.sellingPriceMicros || 0) / 1000000;
                  const shippingVal = Number(product.shippingFee || 0) / 1000000;
                  const returnPercentage = Number(product.returnRate || 0) * 100;

                  // Parse adsAccountIds
                  let mappedIds: string[] = [];
                  if (Array.isArray(product.adsAccountIds)) {
                    mappedIds = product.adsAccountIds;
                  } else if (typeof product.adsAccountIds === "string") {
                    try {
                      mappedIds = JSON.parse(product.adsAccountIds);
                    } catch (e) {
                      mappedIds = [];
                    }
                  }

                  return (
                    <tr key={product.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-text-1">{product.code}</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-text-1 max-w-[180px] truncate" title={product.name}>
                        {product.name}
                        {product.keywordCampaign && (
                          <div className="text-[10px] text-text-3 font-normal mt-0.5">
                            Keyword: <span className="bg-secondary px-1 py-0.2 rounded font-mono text-[9px]">{product.keywordCampaign}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-right text-ads-red-text bg-ads-red-bg/5">
                        {importPrice.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-right text-ads-green-text bg-ads-green-bg/5">
                        {sellingPrice.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-right text-text-2">
                        {shippingVal.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-center text-text-2">
                        {returnPercentage.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {mappedIds.length === 0 ? (
                            <span className="text-[10px] text-text-3 font-medium italic">Chưa map tài khoản</span>
                          ) : (
                            mappedIds.map(cid => {
                              const matchAcc = adsAccounts.find(a => a.customerId === cid);
                              const displayName = matchAcc ? (matchAcc.name || cid) : cid;
                              return (
                                <Badge
                                  key={cid}
                                  variant="outline"
                                  title={`${displayName} (${cid})`}
                                  className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 rounded-md px-1.5 py-0.5 text-[10px] font-semibold truncate max-w-[140px]"
                                >
                                  {displayName}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => handleOpenEdit(product)}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 cursor-pointer text-text-2 hover:text-text-1 hover:bg-secondary rounded"
                            title="Sửa sản phẩm"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleOpenDelete(product)}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 cursor-pointer text-ads-red-text hover:text-ads-red-text hover:bg-ads-red-bg rounded"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE DIALOG MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border border-border rounded-xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text-1">Thêm Sản phẩm Mới</DialogTitle>
            <p className="text-xs text-text-3 mt-1">Điền đầy đủ thông tin để khởi tạo sản phẩm mới trên hệ thống.</p>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Col 1 */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-2 uppercase">Mã sản phẩm *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="VD: SP001"
                    className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-2 uppercase">Giá nhập (VNĐ) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={importPrice}
                      onChange={(e) => setImportPrice(e.target.value)}
                      placeholder="0"
                      className="flex h-9 w-full rounded-lg border border-border bg-card pl-3 pr-8 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
                      min="0"
                      required
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] text-text-3 font-semibold pointer-events-none">đ</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-2 uppercase">Phí Ship trung bình (VNĐ) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(e.target.value)}
                      placeholder="0"
                      className="flex h-9 w-full rounded-lg border border-border bg-card pl-3 pr-8 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
                      min="0"
                      required
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] text-text-3 font-semibold pointer-events-none">đ</span>
                  </div>
                </div>
              </div>

              {/* Col 2 */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-2 uppercase">Tên sản phẩm *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Kem chống nắng dạng Gel"
                    className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-2 uppercase">Giá bán (VNĐ) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="0"
                      className="flex h-9 w-full rounded-lg border border-border bg-card pl-3 pr-8 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
                      min="0"
                      required
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] text-text-3 font-semibold pointer-events-none">đ</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-2 uppercase">Tỉ lệ hoàn hàng (%) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={returnRate}
                      onChange={(e) => setReturnRate(e.target.value)}
                      placeholder="0"
                      className="flex h-9 w-full rounded-lg border border-border bg-card pl-3 pr-8 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] text-text-3 font-semibold pointer-events-none">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Keyword Campaign input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-2 uppercase">Keyword Campaign (Lọc chiến dịch theo tên)</label>
              <input
                type="text"
                value={keywordCampaign}
                onChange={(e) => setKeywordCampaign(e.target.value)}
                placeholder="VD: KemChongNang"
                className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
              />
              <span className="text-[10px] text-text-3 leading-none block mt-0.5">Hệ thống sẽ lọc các chiến dịch Google Ads có tên chứa từ khóa này để tự động gộp chi phí.</span>
            </div>

            {/* MultiSelect for Mapped Accounts */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-2 uppercase">Mapping Tài Khoản Ads liên kết</label>
              <MultiSelect
                options={adsOptions}
                selectedValues={selectedAccountIds}
                onChange={setSelectedAccountIds}
                placeholder="Chọn các tài khoản Google Ads..."
              />
              <span className="text-[10px] text-text-3 leading-none block mt-0.5">Chọn các tài khoản chứa các chiến dịch chạy cho sản phẩm này để ánh xạ số liệu.</span>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-border/60">
              <DialogClose
                render={
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isSubmitting}
                    className="rounded-lg text-xs font-semibold h-9 px-4 cursor-pointer"
                  />
                }
              >
                Hủy
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-text-1 hover:bg-text-1/90 text-bg-card font-semibold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Thêm sản phẩm"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border border-border rounded-xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text-1">Cập nhật sản phẩm</DialogTitle>
            <p className="text-xs text-text-3 mt-1">Chỉnh sửa thông số giá vốn hoặc ánh xạ tài khoản quảng cáo của sản phẩm.</p>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Col 1 */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-2 uppercase">Mã sản phẩm *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="VD: SP001"
                    className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-2 uppercase">Giá nhập (VNĐ) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={importPrice}
                      onChange={(e) => setImportPrice(e.target.value)}
                      placeholder="0"
                      className="flex h-9 w-full rounded-lg border border-border bg-card pl-3 pr-8 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
                      min="0"
                      required
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] text-text-3 font-semibold pointer-events-none">đ</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-2 uppercase">Phí Ship trung bình (VNĐ) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(e.target.value)}
                      placeholder="0"
                      className="flex h-9 w-full rounded-lg border border-border bg-card pl-3 pr-8 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
                      min="0"
                      required
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] text-text-3 font-semibold pointer-events-none">đ</span>
                  </div>
                </div>
              </div>

              {/* Col 2 */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-2 uppercase">Tên sản phẩm *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Kem chống nắng"
                    className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-2 uppercase">Giá bán (VNĐ) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="0"
                      className="flex h-9 w-full rounded-lg border border-border bg-card pl-3 pr-8 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
                      min="0"
                      required
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] text-text-3 font-semibold pointer-events-none">đ</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-2 uppercase">Tỉ lệ hoàn hàng (%) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={returnRate}
                      onChange={(e) => setReturnRate(e.target.value)}
                      placeholder="0"
                      className="flex h-9 w-full rounded-lg border border-border bg-card pl-3 pr-8 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] text-text-3 font-semibold pointer-events-none">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Keyword Campaign input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-2 uppercase">Keyword Campaign (Lọc chiến dịch theo tên)</label>
              <input
                type="text"
                value={keywordCampaign}
                onChange={(e) => setKeywordCampaign(e.target.value)}
                placeholder="VD: KemChongNang"
                className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-text-1"
              />
              <span className="text-[10px] text-text-3 leading-none block mt-0.5">Hệ thống sẽ lọc các chiến dịch Google Ads có tên chứa từ khóa này để tự động gộp chi phí.</span>
            </div>

            {/* MultiSelect for Mapped Accounts */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-2 uppercase">Mapping Tài Khoản Ads liên kết</label>
              <MultiSelect
                options={adsOptions}
                selectedValues={selectedAccountIds}
                onChange={setSelectedAccountIds}
                placeholder="Chọn các tài khoản Google Ads..."
              />
              <span className="text-[10px] text-text-3 leading-none block mt-0.5">Chọn các tài khoản chứa các chiến dịch chạy cho sản phẩm này để ánh xạ số liệu.</span>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-border/60">
              <DialogClose
                render={
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isSubmitting}
                    className="rounded-lg text-xs font-semibold h-9 px-4 cursor-pointer"
                  />
                }
              >
                Hủy
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-text-1 hover:bg-text-1/90 text-bg-card font-semibold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border rounded-xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-text-1">Xác nhận xóa sản phẩm</DialogTitle>
            <p className="text-xs text-text-3 mt-1">
              Bạn có chắc chắn muốn xóa sản phẩm <span className="font-bold text-text-1">"{selectedProduct?.name}"</span>? Hành động này không thể hoàn tác và sẽ ảnh hưởng đến phân tích tài chính PnL.
            </p>
          </DialogHeader>
          <DialogFooter className="mt-6 pt-4 border-t border-border/60">
            <DialogClose
              render={
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isSubmitting}
                  className="rounded-lg text-xs font-semibold h-9 px-4 cursor-pointer"
                />
              }
            >
              Hủy
            </DialogClose>
            <Button
              onClick={handleDeleteSubmit}
              disabled={isSubmitting}
              className="bg-ads-red-bg hover:bg-ads-red-bg/90 text-ads-red-text border border-ads-red-border/40 font-semibold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xác nhận xóa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
