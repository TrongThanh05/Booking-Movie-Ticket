/**
 * Dashboard Home.jsx — Trang tổng quan quản trị
 * Features: 4 stat cards, revenue chart, top movies, recent bookings
 */
import { useState, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Table from "../../components/ui/table/Table";
import dashboardApi from "../../lib/dashboardApi";

const fmt = (n) => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n||0);
const fmtShort = (n) => {
  if(n>=1e9) return `${(n/1e9).toFixed(1)}B`;
  if(n>=1e6) return `${(n/1e6).toFixed(1)}M`;
  if(n>=1e3) return `${(n/1e3).toFixed(1)}K`;
  return n?.toLocaleString('vi-VN')??'0';
};

const StatCard = ({title,value,trend,icon,color}) => {
  const pos = trend>0, zero = !trend;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 hover:shadow-theme-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${color}`}>{icon}</div>
        {!zero && <Badge variant="light" color={pos?'success':'error'} size="sm">
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`mr-0.5 ${pos?'':'rotate-180'}`}><path strokeLinecap="round" strokeLinejoin="round" d="M18 15l-6-6-6 6"/></svg>
          {Math.abs(trend)}%
        </Badge>}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{title}</p>
      </div>
    </div>
  );
};

const MOCK = {
  stats:{revenue:{current:125000000,trend:12.5},movies:{nowShowing:18,trend:5.3},tickets:{current:1247,trend:-3.2},users:{total:5832,trend:8.1}},
  revenueChartData:[{date:'13/5',revenue:18e6},{date:'14/5',revenue:22e6},{date:'15/5',revenue:15e6},{date:'16/5',revenue:28e6},{date:'17/5',revenue:35e6},{date:'18/5',revenue:20e6},{date:'19/5',revenue:30e6}],
  topMovies:[
    {title:'Avengers: Endgame',genres:[{name:'Hành động'}],ticketsSold:342,revenue:51300000},
    {title:'Spider-Man: No Way Home',genres:[{name:'Phiêu lưu'}],ticketsSold:298,revenue:44700000},
    {title:'Doraemon Movie 2025',genres:[{name:'Hoạt hình'}],ticketsSold:256,revenue:25600000},
    {title:'Lật Mặt 7',genres:[{name:'Tâm lý'}],ticketsSold:231,revenue:34650000},
    {title:'Mai',genres:[{name:'Tình cảm'}],ticketsSold:189,revenue:28350000},
  ],
  recentBookings:[
    {_id:'1',booking_code:'BK-A1B2C3',user:{name:'Nguyễn Văn A'},movie:'Avengers: Endgame',total_amount:450000,status:'confirmed',ticketCount:3},
    {_id:'2',booking_code:'BK-D4E5F6',user:{name:'Trần Thị B'},movie:'Doraemon Movie',total_amount:200000,status:'confirmed',ticketCount:2},
    {_id:'3',booking_code:'BK-G7H8I9',user:{name:'Lê Văn C'},movie:'Spider-Man',total_amount:150000,status:'completed',ticketCount:1},
  ],
};

const Home = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(r => setData(r.data))
      .catch(() => setData(MOCK))
      .finally(() => setLoading(false));
  }, []);

  const chartOpts = {
    chart:{type:'area',height:310,fontFamily:'Outfit,sans-serif',toolbar:{show:false},zoom:{enabled:false}},
    colors:['#465fff'],
    fill:{type:'gradient',gradient:{shadeIntensity:1,opacityFrom:0.55,opacityTo:0.05,stops:[0,90,100]}},
    dataLabels:{enabled:false},stroke:{curve:'smooth',width:2},
    xaxis:{categories:data?.revenueChartData?.map(d=>d.date)||[],axisBorder:{show:false},axisTicks:{show:false}},
    yaxis:{labels:{formatter:v=>fmtShort(v)}},
    grid:{borderColor:'#e4e7ec',strokeDashArray:5,yaxis:{lines:{show:true}},xaxis:{lines:{show:false}}},
    tooltip:{theme:'light',y:{formatter:v=>fmt(v)}},
  };

  if(loading) return (
    <><PageMeta title="Dashboard | CineAdmin"/><div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800"/>)}</div>
      <div className="h-80 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800"/>
    </div></>
  );

  const {stats}=data||{};

  return (<>
    <PageMeta title="Dashboard | CineAdmin" description="Tổng quan quản trị rạp phim"/>
    <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tổng quan Dashboard</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Chào mừng trở lại! Đây là tổng quan hoạt động của hệ thống.</p></div>

    {/* Stat Cards */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
      <StatCard title="Doanh thu tháng" value={fmt(stats?.revenue?.current)} trend={stats?.revenue?.trend} icon="💰" color="bg-brand-50 dark:bg-brand-500/15"/>
      <StatCard title="Phim đang chiếu" value={stats?.movies?.nowShowing||0} trend={stats?.movies?.trend} icon="🎬" color="bg-success-50 dark:bg-success-500/15"/>
      <StatCard title="Vé bán ra tháng" value={(stats?.tickets?.current||0).toLocaleString('vi-VN')} trend={stats?.tickets?.trend} icon="🎟️" color="bg-warning-50 dark:bg-warning-500/15"/>
      <StatCard title="Tổng người dùng" value={(stats?.users?.total||0).toLocaleString('vi-VN')} trend={stats?.users?.trend} icon="👥" color="bg-blue-light-50 dark:bg-blue-light-500/15"/>
    </div>

    {/* Revenue Chart */}
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <div><h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Doanh thu 7 ngày gần nhất</h3><p className="text-sm text-gray-500 dark:text-gray-400">Biểu đồ doanh thu theo ngày</p></div>
        <Badge variant="light" color="primary" size="sm">7 ngày</Badge>
      </div>
      <ReactApexChart options={chartOpts} series={[{name:'Doanh thu',data:data?.revenueChartData?.map(d=>d.revenue)||[]}]} type="area" height={310}/>
    </div>

    {/* Bottom Grid */}
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Top Movies */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800"><h3 className="text-base font-semibold text-gray-800 dark:text-white/90">🏆 Top phim bán chạy</h3></div>
        <Table>
          <Table.Head><tr><Table.Header>#</Table.Header><Table.Header>Phim</Table.Header><Table.Header>Vé</Table.Header><Table.Header>Doanh thu</Table.Header></tr></Table.Head>
          <Table.Body>
            {(data?.topMovies||[]).map((m,i)=>(
              <Table.Row key={i}>
                <Table.Cell><span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i===0?'bg-warning-100 text-warning-600 dark:bg-warning-500/15':i===1?'bg-gray-200 text-gray-600 dark:bg-gray-700':'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>{i+1}</span></Table.Cell>
                <Table.Cell><div><p className="font-medium text-gray-800 dark:text-white/90 truncate max-w-[180px]">{m.title}</p><p className="text-xs text-gray-400">{m.genres?.map(g=>g.name).join(', ')}</p></div></Table.Cell>
                <Table.Cell><span className="font-semibold">{m.ticketsSold?.toLocaleString('vi-VN')}</span></Table.Cell>
                <Table.Cell className="whitespace-nowrap">{fmt(m.revenue)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>

      {/* Recent Bookings */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800"><h3 className="text-base font-semibold text-gray-800 dark:text-white/90">🎟️ Đặt vé gần nhất</h3></div>
        <Table>
          <Table.Head><tr><Table.Header>Mã vé</Table.Header><Table.Header>Khách</Table.Header><Table.Header>Phim</Table.Header><Table.Header>Tổng</Table.Header><Table.Header>Trạng thái</Table.Header></tr></Table.Head>
          <Table.Body>
            {(data?.recentBookings||[]).map(b=>(
              <Table.Row key={b._id}>
                <Table.Cell><span className="font-mono text-xs font-semibold text-brand-500">{b.booking_code}</span></Table.Cell>
                <Table.Cell><p className="font-medium truncate max-w-[100px]">{b.user?.name||'N/A'}</p></Table.Cell>
                <Table.Cell><p className="truncate max-w-[120px]">{b.movie}</p></Table.Cell>
                <Table.Cell className="whitespace-nowrap font-medium">{fmt(b.total_amount)}</Table.Cell>
                <Table.Cell><Badge variant="light" color={b.status==='confirmed'?'success':b.status==='completed'?'primary':b.status==='pending'?'warning':'error'} size="sm">{b.status==='confirmed'?'Xác nhận':b.status==='completed'?'Hoàn thành':b.status==='pending'?'Chờ xử lý':'Đã huỷ'}</Badge></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </div>
  </>);
};

export default Home;
