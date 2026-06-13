'use client'

import { useState } from 'react'
import {
  BookOpen,
  Search,
  ArrowRight,
  Link as LinkIcon,
  Clock,
  Sliders,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  HelpCircle,
  Activity,
  Radar,
  TrendingUp,
  FolderSync,
  Info
} from 'lucide-react'

// Types
type GuideItem = {
  question: string
  answer: string
  steps?: string[]
}

type GuideSection = {
  id: string
  title: string
  description: string
  icon: any
  items: GuideItem[]
}

export default function GuidePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'accounts-0': true, // Open first item by default
  })

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Danh sách tài liệu hướng dẫn chi tiết
  const guideSections: GuideSection[] = [
    {
      id: 'accounts',
      title: '1. Liên kết & Đồng bộ tài khoản Google Ads',
      description: 'Các bước đầu tiên để kết nối và cho phép hệ thống tải dữ liệu chiến dịch của bạn.',
      icon: FolderSync,
      items: [
        {
          question: 'Làm thế nào để liên kết tài khoản Google Ads mới vào hệ thống?',
          answer: 'Đây là bước bắt buộc đầu tiên để hệ thống có thể quản lý chiến dịch của bạn. Hãy làm theo các bước sau:',
          steps: [
            'Bước 1: Từ menu bên trái, chọn "Quản lý kết nối" dưới mục Cấu hình & Tích hợp.',
            'Bước 2: Nhấp vào nút "Kết nối Google Ads". Hệ thống sẽ chuyển hướng bạn đến trang xác thực an toàn của Google.',
            'Bước 3: Chọn tài khoản Gmail đang quản lý tài khoản quảng cáo của bạn.',
            'Bước 4: Đọc kỹ các quyền truy cập và nhấn "Cho phép" (Allow) để cấp quyền truy xuất dữ liệu chiến dịch.',
            'Bước 5: Sau khi quay lại hệ thống, bạn sẽ thấy kết nối của mình hiển thị ở trạng thái "Hoạt động".'
          ]
        },
        {
          question: 'Làm cách nào để kích hoạt tài khoản con (Ads Client Account) cụ thể?',
          answer: 'Nếu Gmail của bạn quản lý nhiều tài khoản Google Ads con (hoặc tài khoản MCC quản lý cấp dưới), bạn cần chọn tài khoản con muốn quản lý:',
          steps: [
            'Bước 1: Vào trang "Tài khoản Ads" trên Menu Sidebar.',
            'Bước 2: Tìm tài khoản quảng cáo con mà bạn muốn chạy tối ưu hóa.',
            'Bước 3: Nhấp vào nút gạt hoặc nút "Đồng bộ" bên cạnh tài khoản đó để chuyển trạng thái sang hoạt động (Enabled).',
            'Bước 4: Đợi hệ thống tải danh sách chiến dịch của tài khoản đó về (quá trình này chỉ mất 10-15 giây).'
          ]
        }
      ]
    },
    {
      id: 'dayparting',
      title: '2. Lập lịch chạy thầu (Dayparting - Bật/Tắt theo giờ)',
      description: 'Lên lịch tự động bật/tắt quảng cáo hoặc điều chỉnh ngân sách theo các khung giờ vàng hoặc tắt vào ban đêm.',
      icon: Clock,
      items: [
        {
          question: 'Dayparting là gì và tại sao tôi nên sử dụng nó?',
          answer: 'Dayparting giúp bạn lên lịch tự động cho quảng cáo dựa trên thời gian thực tế trong ngày. Ví dụ, nhiều doanh nghiệp có tỷ lệ chuyển đổi rất thấp vào ban đêm (từ 23h đến 6h sáng) nhưng chi phí click vẫn phát sinh. Sử dụng Dayparting giúp bạn tắt chiến dịch vào giờ này và tự động bật lại vào sáng hôm sau để tối ưu hóa ngân sách.',
        },
        {
          question: 'Cách lên lịch tự động Tắt chiến dịch vào ban đêm và Bật lại vào buổi sáng?',
          answer: 'Để thiết lập chu trình tự động này, bạn chỉ cần tạo 2 lịch trình chạy thầu rất đơn giản như sau:',
          steps: [
            'Phần 1 - Tự động tắt lúc 23:00:',
            '1. Vào trang "Lập lịch chạy thầu" trên menu, nhấn "Tạo lịch trình mới".',
            '2. Chọn tài khoản quảng cáo và đặt tên lịch trình (ví dụ: "Tắt camp ban đêm").',
            '3. Chọn khung giờ chạy là "23:00". Chọn hành động là "Tạm dừng chiến dịch".',
            '4. Tích chọn các chiến dịch bạn muốn áp dụng luật này và nhấn "Lưu".',
            'Phần 2 - Tự động bật lại lúc 06:00 sáng:',
            '1. Tạo thêm một lịch trình mới, đặt tên (ví dụ: "Bật lại camp buổi sáng").',
            '2. Chọn khung giờ chạy là "06:00". Chọn hành động là "Bật chiến dịch".',
            '3. Tích chọn các chiến dịch giống như phần 1 và nhấn "Lưu".',
            'Kết quả: Đúng 23h đêm hệ thống sẽ tắt camp và đúng 6h sáng hôm sau hệ thống sẽ bật lại hoàn toàn tự động.'
          ]
        },
        {
          question: 'Tôi có thể tăng hoặc giảm ngân sách theo giờ cao điểm không?',
          answer: 'Có! Hệ thống hỗ trợ thay đổi ngân sách tự động. Ví dụ, bạn có thể thiết lập: tăng ngân sách lên 30% vào khung giờ vàng mua sắm (11:00 - 13:00 và 20:00 - 22:00) và giảm ngân sách về mức cũ vào các giờ khác. Hãy chọn hành động "Tăng ngân sách" hoặc "Giảm ngân sách", chọn đơn vị là % hoặc VNĐ, sau đó chọn khung giờ mong muốn.',
        }
      ]
    },
    {
      id: 'rules',
      title: '3. Quy tắc tự động (Rule Engine - Tối ưu theo hiệu quả)',
      description: 'Cách thiết lập điều kiện tự động tắt quảng cáo nếu bị lỗ (ROAS thấp) hoặc tăng ngân sách khi chiến dịch đang ra đơn tốt.',
      icon: Sliders,
      items: [
        {
          question: 'Quy tắc tự động (Rule Engine) hoạt động như thế nào?',
          answer: 'Hệ thống sẽ liên tục quét dữ liệu chiến dịch của bạn. Nếu phát hiện chiến dịch thỏa mãn điều kiện bạn đặt ra (ví dụ: Chi phí > 500k mà không có chuyển đổi), hệ thống sẽ lập tức thực hiện hành động bạn đã cài đặt trước (như Tạm dừng chiến dịch hoặc gửi cảnh báo). Việc này giúp bảo vệ ngân sách của bạn 24/7 kể cả khi bạn đang ngủ.',
        },
        {
          question: 'Cách tạo một quy tắc tự động hóa cơ bản?',
          answer: 'Hãy thực hiện theo các bước trực quan dưới đây:',
          steps: [
            'Bước 1: Vào trang "Quy tắc tự động" và nhấn nút "Tạo Rule mới".',
            'Bước 2: Điền tên Rule dễ nhớ (Ví dụ: "Tắt camp khi ROAS < 1.0").',
            'Bước 3: Chọn tài khoản quảng cáo và áp dụng cho "Tất cả chiến dịch" hoặc "Một số chiến dịch cụ thể".',
            'Bước 4: Thêm điều kiện tối ưu. Ví dụ: Chọn chỉ số là "ROAS", toán tử là "<" (nhỏ hơn), và giá trị là "1". Bạn có thể thêm điều kiện phụ như "Chi phí (Cost) > 200,000đ" để tránh tắt nhầm các camp mới chạy chưa tiêu đủ tiền.',
            'Bước 5: Chọn hành động là "Tạm dừng chiến dịch". Chọn mức độ ưu tiên và nhấn "Lưu quy tắc".'
          ]
        }
      ]
    },
    {
      id: 'ai-tools',
      title: '4. Các công cụ tối ưu thông minh AI',
      description: 'Hướng dẫn sử dụng trợ lý phân tích AI, Rada lọc kênh rác YouTube và công cụ phân bổ ngân sách.',
      icon: Sparkles,
      items: [
        {
          question: 'AI Analyst hoạt động như thế nào và tôi có thể hỏi gì?',
          answer: 'AI Analyst giống như một chuyên gia quảng cáo riêng của bạn. Công cụ này được kết nối trực tiếp với dữ liệu chiến dịch. Bạn có thể sử dụng khung chat để hỏi các câu bằng tiếng Việt tự nhiên như:\n- "Chiến dịch nào đang hiệu quả nhất tuần này và tại sao?"\n- "Tại sao chi phí của tôi tăng cao nhưng lượt chuyển đổi lại giảm?"\n- "Hãy gợi ý cách tối ưu chiến dịch A."',
        },
        {
          question: 'Cách sử dụng "Rada Diệt Kênh Rác" để tối ưu quảng cáo YouTube & Hiển thị?',
          answer: 'Khi chạy quảng cáo trên mạng hiển thị (GDN) hoặc video YouTube, Google thường phân bổ quảng cáo của bạn lên các kênh rác, kênh trẻ em gây lãng phí tiền. Rada Diệt Kênh Rác giúp xử lý việc này:',
          steps: [
            'Bước 1: Chọn trang "Rada Diệt Kênh Rác" dưới mục AI Integration.',
            'Bước 2: Hệ thống sẽ phân tích danh sách các vị trí hiển thị (Placement) đã tiêu tiền của bạn.',
            'Bước 3: AI sẽ tự động phân loại và dán nhãn các kênh rác, kênh click ảo dựa trên phân tích nội dung.',
            'Bước 4: Bạn chỉ cần nhấn nút "Loại trừ hàng loạt" để hệ thống tự động đẩy danh sách kênh rác này vào mục phủ định của Google Ads, ngăn không cho quảng cáo hiển thị trên đó nữa.'
          ]
        },
        {
          question: 'Budget Optimizer là gì?',
          answer: 'Đây là công cụ tự động theo dõi hiệu suất của nhiều chiến dịch song song. Nếu phát hiện Chiến dịch A đang sinh lời rất tốt (ROAS cao, giá đơn rẻ) nhưng sắp hết ngân sách, còn Chiến dịch B đang hoạt động kém và thừa ngân sách, hệ thống sẽ tự động chuyển bớt ngân sách từ B sang A để tối đa hóa số đơn hàng bạn nhận được với cùng một tổng chi phí.',
        }
      ]
    }
  ]

  // Lọc danh sách hướng dẫn theo từ khóa tìm kiếm
  const filteredSections = guideSections.map(section => {
    const matchedItems = section.items.filter(item => 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.steps && item.steps.some(step => step.toLowerCase().includes(searchQuery.toLowerCase())))
    )
    return {
      ...section,
      items: matchedItems
    }
  }).filter(section => section.items.length > 0)

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* ── Cột Header Trang ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card p-6 rounded-[var(--radius)] border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[calc(var(--radius)*0.8)] bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Hướng dẫn sử dụng</h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Tài liệu hướng dẫn thao tác chi tiết bằng tiếng Việt giúp bạn làm chủ hệ thống tối ưu hóa quảng cáo.
            </p>
          </div>
        </div>
      </div>

      {/* ── Thanh tìm kiếm trực quan ── */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4.5 w-4.5 text-muted-foreground" />
        </div>
        <input
          type="text"
          placeholder="Tìm câu hỏi, tính năng hoặc từ khóa hướng dẫn (Ví dụ: kết nối, chạy thầu, gỡ kênh rác...)..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-[var(--radius)] text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all font-medium shadow-sm"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-muted-foreground hover:text-foreground font-semibold"
          >
            Xóa lọc
          </button>
        )}
      </div>

      {/* ── Quy trình 3 bước nhanh cho người mới bắt đầu ── */}
      {!searchQuery && (
        <div className="bg-card border border-border rounded-[var(--radius)] p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Quy trình khởi đầu nhanh trong 3 bước
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            
            {/* Step 1 */}
            <div className="flex flex-col space-y-2.5 p-4 rounded-lg bg-secondary/30 border border-border/50 relative hover:border-primary/20 transition-all">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="text-xs font-bold text-foreground">Kết nối Tài khoản</h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pl-10">
                Vào mục <strong>Quản lý kết nối</strong> để liên kết tài khoản Gmail quản lý quảng cáo của bạn với hệ thống.
              </p>
              <div className="flex items-center gap-1.5 pl-10 pt-1 text-[11px] font-bold text-primary hover:underline cursor-pointer">
                <LinkIcon size={12} /> Kết nối ngay <ArrowRight size={10} />
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col space-y-2.5 p-4 rounded-lg bg-secondary/30 border border-border/50 relative hover:border-primary/20 transition-all">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="text-xs font-bold text-foreground">Lập lịch & Cài luật</h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pl-10">
                Tạo lịch chạy thầu <strong>Dayparting</strong> để tắt camp đêm, hoặc cài <strong>Quy tắc tự động</strong> tắt khi lỗ.
              </p>
              <div className="flex items-center gap-1.5 pl-10 pt-1 text-[11px] font-bold text-primary hover:underline cursor-pointer">
                <Clock size={12} /> Cài đặt lịch <ArrowRight size={10} />
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col space-y-2.5 p-4 rounded-lg bg-secondary/30 border border-border/50 relative hover:border-primary/20 transition-all">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="text-xs font-bold text-foreground">Theo dõi bằng AI</h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pl-10">
                Sử dụng <strong>AI Analyst</strong> để chat đặt câu hỏi, hoặc bật <strong>Rada</strong> lọc kênh rác tự động.
              </p>
              <div className="flex items-center gap-1.5 pl-10 pt-1 text-[11px] font-bold text-primary hover:underline cursor-pointer">
                <Sparkles size={12} /> Trải nghiệm AI <ArrowRight size={10} />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Khối Accordion Hướng Dẫn Chi Tiết ── */}
      <div className="space-y-6">
        {filteredSections.map((section) => {
          const SectionIcon = section.icon
          return (
            <div key={section.id} className="bg-card border border-border rounded-[var(--radius)] overflow-hidden shadow-sm">
              
              {/* Section Header */}
              <div className="p-5 border-b border-border bg-secondary/10 flex items-center gap-4.5">
                <div className="w-10 h-10 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
                  <SectionIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground leading-tight">{section.title}</h2>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-normal">{section.description}</p>
                </div>
              </div>

              {/* Accordion Questions List */}
              <div className="divide-y divide-border">
                {section.items.map((item, index) => {
                  const itemKey = `${section.id}-${index}`
                  const isOpen = !!openItems[itemKey]

                  return (
                    <div key={index} className="transition-colors duration-150">
                      
                      {/* Question Trigger Button */}
                      <button
                        onClick={() => toggleItem(itemKey)}
                        className="w-full flex items-center justify-between text-left p-5 hover:bg-secondary/20 transition-all cursor-pointer outline-none group"
                      >
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                          <HelpCircle size={15} className="text-muted-foreground shrink-0" />
                          {item.question}
                        </span>
                        <ChevronDown 
                          size={16} 
                          className={`text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'transform rotate-180 text-primary' : ''}`}
                        />
                      </button>

                      {/* Answer Collapsible Area */}
                      {isOpen && (
                        <div className="px-5 pb-5 pl-10 text-xs text-muted-foreground leading-relaxed space-y-3 animate-in slide-in-from-top-1 duration-150">
                          
                          {/* Main answer text */}
                          <div className="whitespace-pre-line text-foreground/90 font-medium">
                            {item.answer}
                          </div>

                          {/* Action Steps checklist if any */}
                          {item.steps && item.steps.length > 0 && (
                            <div className="mt-3.5 p-4 rounded-lg bg-secondary/20 border border-border/60 space-y-2.5">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1.5">
                                <Info size={12} /> Các bước thực hiện:
                              </p>
                              {item.steps.map((step, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-2.5 text-xs text-foreground/80 leading-relaxed font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                  <span className="flex-1">{step}</span>
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

            </div>
          )
        })}

        {filteredSections.length === 0 && (
          <div className="bg-card border border-border border-dashed rounded-[var(--radius)] py-16 text-center">
            <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-xs font-bold text-foreground mb-1">Không tìm thấy hướng dẫn nào</h3>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Thử tìm kiếm với từ khóa khác như "kết nối", "dayparting", "luật" hoặc "rules".
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
