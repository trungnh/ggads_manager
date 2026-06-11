"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Send, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Settings, 
  Bot, 
  FileText, 
  Moon, 
  Sun,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TelegramConnection {
  id: string;
  name: string;
  botToken: string;
  chatId: string;
  status: string;
  createdAt: string;
}

interface TelegramReport {
  id: string;
  name: string;
  connectionId: string;
  isEnabled: boolean;
  frequencyMinutes: number;
  hoursStart: string;
  hoursEnd: string;
  customMessage: string | null;
  lastSentAt: string | null;
  connection?: TelegramConnection;
}

export default function SettingsPageClient() {
  const [activeTab, setActiveTab] = useState<"telegram" | "reports">("telegram");
  
  // Connections state
  const [connections, setConnections] = useState<TelegramConnection[]>([]);
  const [isConnModalOpen, setIsConnModalOpen] = useState(false);
  const [connName, setConnName] = useState("");
  const [connBotToken, setConnBotToken] = useState("");
  const [connChatId, setConnChatId] = useState("");
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connError, setConnError] = useState("");
  const [connSuccess, setConnSuccess] = useState("");

  // Reports state
  const [reports, setReports] = useState<TelegramReport[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<TelegramReport | null>(null);
  const [reportName, setReportName] = useState("");
  const [reportConnId, setReportConnId] = useState("");
  const [reportFreq, setReportFreq] = useState(60);
  const [reportStart, setReportStart] = useState("06:00");
  const [reportEnd, setReportEnd] = useState("22:00");
  const [reportCustomMsg, setReportCustomMsg] = useState("");
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [reportError, setReportError] = useState("");

  // Loading states
  const [isLoadingConns, setIsLoadingConns] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchConnections();
    fetchReports();
  }, []);



  const fetchConnections = async () => {
    setIsLoadingConns(true);
    try {
      const res = await fetch("/api/telegram/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (err) {
      console.error("Failed to fetch Telegram connections:", err);
    } finally {
      setIsLoadingConns(false);
    }
  };

  const fetchReports = async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch("/api/telegram/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Failed to fetch Telegram reports:", err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Add / Save Connection
  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connName || !connBotToken || !connChatId) {
      setConnError("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    setConnError("");
    setConnSuccess("");
    setIsTestingConn(true);

    try {
      const res = await fetch("/api/telegram/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: connName,
          botToken: connBotToken,
          chatId: connChatId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gặp lỗi khi tạo kết nối.");
      }

      setConnSuccess("Kết nối thành công! Một tin nhắn thử nghiệm đã được gửi.");
      setTimeout(() => {
        setIsConnModalOpen(false);
        setConnName("");
        setConnBotToken("");
        setConnChatId("");
        setConnSuccess("");
        fetchConnections();
      }, 1500);

    } catch (err: any) {
      setConnError(err.message || "Gặp lỗi khi xác thực thông tin Telegram.");
    } finally {
      setIsTestingConn(false);
    }
  };

  // Delete Connection
  const handleDeleteConnection = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa kết nối Telegram này không?")) return;

    try {
      const res = await fetch(`/api/telegram/connections?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchConnections();
        fetchReports(); // Connection deletion cascades/references report, so update both
      }
    } catch (err) {
      console.error("Failed to delete connection:", err);
    }
  };

  // Add / Edit Report
  const handleOpenReportModal = (report: TelegramReport | null = null) => {
    setEditingReport(report);
    setReportError("");
    if (report) {
      setReportName(report.name);
      setReportConnId(report.connectionId);
      setReportFreq(report.frequencyMinutes);
      setReportStart(report.hoursStart);
      setReportEnd(report.hoursEnd);
      setReportCustomMsg(report.customMessage || "");
    } else {
      setReportName("");
      setReportConnId(connections[0]?.id || "");
      setReportFreq(60);
      setReportStart("06:00");
      setReportEnd("22:00");
      setReportCustomMsg("");
    }
    setIsReportModalOpen(true);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName || !reportConnId) {
      setReportError("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    setReportError("");
    setIsSavingReport(true);

    const payload = {
      id: editingReport?.id,
      name: reportName,
      connectionId: reportConnId,
      frequencyMinutes: reportFreq,
      hoursStart: reportStart,
      hoursEnd: reportEnd,
      customMessage: reportCustomMsg || null,
    };

    try {
      const res = await fetch("/api/telegram/reports", {
        method: editingReport ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gặp lỗi khi lưu lịch báo cáo.");
      }

      setIsReportModalOpen(false);
      fetchReports();
    } catch (err: any) {
      setReportError(err.message || "Gặp lỗi khi lưu lịch báo cáo.");
    } finally {
      setIsSavingReport(false);
    }
  };

  // Delete Report
  const handleDeleteReport = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa lịch báo cáo định kỳ này không?")) return;

    try {
      const res = await fetch(`/api/telegram/reports?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchReports();
      }
    } catch (err) {
      console.error("Failed to delete report:", err);
    }
  };

  // Toggle Report Enabled Status
  const handleToggleReport = async (report: TelegramReport) => {
    try {
      const res = await fetch("/api/telegram/reports", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: report.id,
          isEnabled: !report.isEnabled,
        }),
      });
      if (res.ok) {
        fetchReports();
      }
    } catch (err) {
      console.error("Failed to toggle report:", err);
    }
  };

  // Instant Test Send for Saved Connection
  const handleTriggerTest = async (connectionId: string) => {
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      if (res.ok) {
        alert("✅ Đã gửi một tin nhắn thử nghiệm tới kết nối thành công!");
      } else {
        const data = await res.json();
        alert(`❌ Gửi tin thất bại: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ Lỗi kết nối: ${err.message}`);
    }
  };

  const insertVariable = (variable: string) => {
    setReportCustomMsg(prev => prev + `{${variable}}`);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Settings className="h-8 w-8 text-emerald-500" />
            Cài Đặt Hệ Thống
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm md:text-base">
            Quản lý tích hợp tối ưu AI, cấu hình kết nối Telegram đa Bot và đặt lịch báo cáo P&L tự động.
          </p>
        </div>
      </div>

      {/* Modern Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 p-1 bg-slate-100/80 dark:bg-slate-900/60 rounded-xl max-w-sm backdrop-blur-md">
        <button
          onClick={() => setActiveTab("telegram")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${
            activeTab === "telegram"
              ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm font-semibold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40"
          }`}
        >
          <Bot className="h-4 w-4" />
          Đa Telegram Bot
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${
            activeTab === "reports"
              ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm font-semibold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40"
          }`}
        >
          <FileText className="h-4 w-4" />
          Đặt lịch P&L
        </button>
      </div>



      {/* TAB CONTENT: TELEGRAM CONNECTIONS */}
      {activeTab === "telegram" && (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 flex flex-row items-center justify-between gap-4 p-6">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Bot className="h-5 w-5 text-emerald-500" />
                Quản Lý Kết Nối Telegram Đa Bot
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                Kết nối nhiều phòng chat nhóm hoặc chat cá nhân qua Bot Token riêng để phân loại thông báo tối ưu.
              </CardDescription>
            </div>
            <Button 
              onClick={() => {
                setConnError("");
                setConnSuccess("");
                setIsConnModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 rounded-xl shadow-lg shadow-emerald-500/10 transition-all duration-300"
            >
              <Plus className="h-4 w-4" />
              Thêm kết nối mới
            </Button>
          </CardHeader>
          
          <CardContent className="p-0">
            {isLoadingConns ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <span className="text-sm">Đang tải danh sách kết nối...</span>
              </div>
            ) : connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center px-4">
                <Bot className="h-14 w-14 text-slate-300 dark:text-slate-800 mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Chưa có kết nối Telegram nào</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Hãy nhấn nút "Thêm kết nối mới" để liên kết các nhóm chat nhận thông tin hiệu quả quảng cáo.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Tên kết nối</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Chat ID</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Bot Token ẩn</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Trạng thái</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((conn) => (
                    <TableRow key={conn.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-all">
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{conn.name}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{conn.chatId}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-500">
                        {conn.botToken.substring(0, 10)}****************
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium text-xs">
                          🟢 Hoạt động
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTriggerTest(conn.id)}
                          className="h-9 px-3 border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-600 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 transition-all"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Gửi tin test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteConnection(conn.id)}
                          className="h-9 w-9 p-0 border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-500 dark:border-slate-800 dark:hover:bg-red-950/40 dark:hover:text-red-400 rounded-lg inline-flex items-center justify-center transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: PERIODIC REPORTS */}
      {activeTab === "reports" && (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 flex flex-row items-center justify-between gap-4 p-6">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <FileText className="h-5 w-5 text-emerald-500" />
                Lịch Báo Cáo Hiệu Suất P&L Tự Động
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                Lên lịch gửi tự động các báo cáo chi tiêu, đơn hàng CRM và doanh thu P&L thực tế theo các khung giờ.
              </CardDescription>
            </div>
            <Button 
              disabled={connections.length === 0}
              onClick={() => handleOpenReportModal(null)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 rounded-xl shadow-lg shadow-emerald-500/10 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300"
            >
              <Plus className="h-4 w-4" />
              Tạo lịch báo cáo mới
            </Button>
          </CardHeader>
          
          <CardContent className="p-0">
            {connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center px-4">
                <AlertTriangle className="h-12 w-12 text-amber-500 mb-4 animate-bounce" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Yêu cầu kết nối Telegram trước</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Vui lòng thêm ít nhất một kết nối Telegram ở Tab "Đa Telegram Bot" để thiết lập nhận báo cáo định kỳ.
                </p>
              </div>
            ) : isLoadingReports ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <span className="text-sm">Đang tải lịch báo cáo...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center px-4">
                <FileText className="h-14 w-14 text-slate-300 dark:text-slate-800 mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Chưa có lịch báo cáo nào</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Nhấn "Tạo lịch báo cáo mới" để gửi P&L tài chính tự động đến các nhóm Media Buyers hoặc nhóm Admin.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Tên lịch báo cáo</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Tần suất gửi</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Kênh nhận</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Khung giờ gửi</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Kích hoạt</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-all">
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{report.name}</TableCell>
                      <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                        Mỗi {report.frequencyMinutes} phút
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {report.connection?.name || "Kênh không tồn tại"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-600 dark:text-slate-400">
                        {report.hoursStart} - {report.hoursEnd}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleReport(report)}
                          className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                            report.isEnabled ? "bg-emerald-500 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                          }`}
                        >
                          <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                        </button>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReportModal(report)}
                          className="h-9 px-3 border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-600 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 transition-all"
                        >
                          Sửa đổi
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                          className="h-9 w-9 p-0 border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-500 dark:border-slate-800 dark:hover:bg-red-950/40 dark:hover:text-red-400 rounded-lg inline-flex items-center justify-center transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* POPUP MODAL: ADD CONNECTION */}
      {isConnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="h-6 w-6 text-emerald-500" />
                Thêm Kết Nối Telegram Mới
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Nhập Bot Token từ @BotFather và Chat ID của bạn để kích hoạt.
              </p>
            </div>
            
            <form onSubmit={handleSaveConnection}>
              <div className="p-6 space-y-4">
                {connError && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-400 text-xs leading-relaxed">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{connError}</span>
                  </div>
                )}
                {connSuccess && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs leading-relaxed">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{connSuccess}</span>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên kết nối gợi nhớ <span className="text-red-500">*</span></label>
                  <Input 
                    type="text" 
                    placeholder="Ví dụ: Nhóm Media Buyers" 
                    value={connName}
                    onChange={(e) => setConnName(e.target.value)}
                    required 
                    className="bg-slate-50 dark:bg-slate-900 rounded-xl"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Telegram Bot Token <span className="text-red-500">*</span></label>
                  <Input 
                    type="password" 
                    placeholder="Mã token lấy từ @BotFather (ví dụ: 12345:AAFi...)" 
                    value={connBotToken}
                    onChange={(e) => setConnBotToken(e.target.value)}
                    required 
                    className="bg-slate-50 dark:bg-slate-900 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Chat ID Nhóm / Kênh / Cá nhân <span className="text-red-500">*</span></label>
                  <Input 
                    type="text" 
                    placeholder="Mã số chat ID (Chat nhóm thường bắt đầu bằng dấu trừ -)" 
                    value={connChatId}
                    onChange={(e) => setConnChatId(e.target.value)}
                    required 
                    className="bg-slate-50 dark:bg-slate-900 rounded-xl"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    💡 Hãy chắc chắn rằng bạn đã thêm Bot vào nhóm chat hoặc kênh và cấp quyền admin/member trước khi lưu.
                  </p>
                </div>
              </div>
              
              <div className="border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 px-6 py-4 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsConnModalOpen(false)}
                  className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl"
                >
                  Hủy bỏ
                </Button>
                <Button 
                  type="submit" 
                  disabled={isTestingConn}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 disabled:opacity-70"
                >
                  {isTestingConn ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xác minh...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Gửi tin thử & Lưu
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: ADD/EDIT REPORT */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
            <div className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 p-6 flex-shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-6 w-6 text-emerald-500" />
                {editingReport ? "Chỉnh Sửa Lịch Báo Cáo P&L" : "Đặt Lịch Báo Cáo P&L Tự Động"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Cấu hình thời gian gửi và nội dung tin nhắn báo cáo hiệu quả tài chính hôm nay.
              </p>
            </div>
            
            <form onSubmit={handleSaveReport} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-6 space-y-4 flex-1">
                {reportError && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-400 text-xs leading-relaxed">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{reportError}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên lịch báo cáo <span className="text-red-500">*</span></label>
                    <Input 
                      type="text" 
                      placeholder="Ví dụ: P&L Media Buyers Hàng Giờ" 
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      required 
                      className="bg-slate-50 dark:bg-slate-900 rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Kênh Telegram nhận tin <span className="text-red-500">*</span></label>
                    <select
                      value={reportConnId}
                      onChange={(e) => setReportConnId(e.target.value)}
                      required
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {connections.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.chatId})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tần suất gửi định kỳ</label>
                    <select
                      value={reportFreq}
                      onChange={(e) => setReportFreq(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value={30}>Mỗi 30 phút</option>
                      <option value={60}>Mỗi 1 giờ (Hàng giờ)</option>
                      <option value={120}>Mỗi 2 giờ</option>
                      <option value={240}>Mỗi 4 giờ</option>
                      <option value={720}>Mỗi 12 giờ</option>
                      <option value={1440}>Mỗi ngày (24 giờ)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Giờ bắt đầu gửi hàng ngày</label>
                    <Input 
                      type="text" 
                      placeholder="Ví dụ: 06:00" 
                      value={reportStart}
                      onChange={(e) => setReportStart(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 rounded-xl font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Giờ kết thúc gửi hàng ngày</label>
                    <Input 
                      type="text" 
                      placeholder="Ví dụ: 22:00" 
                      value={reportEnd}
                      onChange={(e) => setReportEnd(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nội dung tin nhắn báo cáo P&L</label>
                    <span className="text-[10px] text-slate-400">Trống = Dùng mẫu mặc định của hệ thống</span>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Mẫu báo cáo P&L mặc định của hệ thống..."
                    value={reportCustomMsg}
                    onChange={(e) => setReportCustomMsg(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  
                  {/* Variables Helper Tags */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">💡 Chèn nhanh các biến số động P&L (Click vào nhãn):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "Chi tiêu Ads", var: "ads_cost" },
                        { label: "Đơn thành công", var: "crm_success_orders" },
                        { label: "Đơn chờ", var: "crm_pending_orders" },
                        { label: "Doanh thu thực", var: "net_revenue" },
                        { label: "ROAS thực", var: "roas" },
                        { label: "Lợi nhuận ròng", var: "profit" },
                        { label: "Tỉ lệ chốt thành công", var: "success_rate" },
                      ].map((item) => (
                        <button
                          key={item.var}
                          type="button"
                          onClick={() => insertVariable(item.var)}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg transition-all border border-slate-200/50 dark:border-slate-800/50"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsReportModalOpen(false)}
                  className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl"
                >
                  Hủy bỏ
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSavingReport}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 disabled:opacity-75"
                >
                  {isSavingReport ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu lịch báo cáo"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
