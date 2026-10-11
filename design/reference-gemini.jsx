// Referência visual enviada pelo time (gerada no Gemini Canvas). NÃO é código do app:
// é o molde de design (Tailwind + lucide-react, paleta slate/indigo/emerald) a ser seguido pelo apps/web.
import React, { useState } from 'react';
import {
  User, Briefcase, Search, MessageSquare, FileText,
  Settings, Wallet, CheckCircle, ExternalLink, Menu,
  X, Send, ArrowRight, ShieldCheck, Plus, Filter, ChevronRight
} from 'lucide-react';

const MOCK_PROFILES = [
  { id: 1, name: "Ana Silva", role: "Contadora Crypto", desc: "Especialista em declaração de stablecoins e DeFi para freelancers.", avatar: "https://i.pravatar.cc/150?u=1" },
  { id: 2, name: "Carlos Mendes", role: "Contador PJ", desc: "Abertura de empresas, emissão de NF e conciliação internacional.", avatar: "https://i.pravatar.cc/150?u=2" },
  { id: 3, name: "Lucas Dev", role: "Desenvolvedor Web3", desc: "Recebo 100% em USDC, busco contador para organização fiscal.", avatar: "https://i.pravatar.cc/150?u=3" },
  { id: 4, name: "Mariana UX", role: "Product Designer", desc: "Trabalho para o exterior, preciso conciliar faturas (Invoices).", avatar: "https://i.pravatar.cc/150?u=4" },
];

const MOCK_INVOICES = [
  { id: "INV-2026-089", client: "TechCorp Labs", amount: 2450.00, status: "Pago", date: "10 Out 2026", tx: "0x8f3...a1b" },
  { id: "INV-2026-090", client: "Studio XYZ", amount: 800.00, status: "Pendente", date: "15 Out 2026", tx: null },
  { id: "INV-2026-091", client: "Global Agency", amount: 1200.00, status: "Parcial", date: "12 Out 2026", tx: "0x1c2...d4e" },
];

const LoginScreen = ({ onLogin }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">PeyTrail</h1>
        <p className="text-slate-500 mt-2">Conectando serviços globais à conformidade local.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
          <input type="email" placeholder="seu@email.com" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
          <input type="password" placeholder="••••••••" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
        </div>
        <button onClick={onLogin} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg transition-colors mt-2">
          Entrar
        </button>

        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">ou</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button onClick={onLogin} className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-2.5 rounded-lg transition-colors border border-indigo-200">
          <Wallet size={20} />
          Conectar Carteira Web3
        </button>
      </div>
    </div>
  </div>
);

const RoleSelectionScreen = ({ onSelect }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="max-w-3xl w-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900">Como você deseja usar o PeyTrail?</h2>
        <p className="text-slate-500 mt-2">Escolha seu perfil para personalizar sua experiência.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <button onClick={() => onSelect('freelancer')} className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all text-left flex flex-col items-center">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <User size={40} />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 text-center">Sou Prestador de Serviço</h3>
          <p className="text-slate-500 text-center mt-2">Emita faturas, receba em USDC e encontre contadores para organizar suas finanças.</p>
        </button>

        <button onClick={() => onSelect('accountant')} className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-left flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Briefcase size={40} />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 text-center">Sou Contador</h3>
          <p className="text-slate-500 text-center mt-2">Encontre clientes web3, envie propostas e acesse históricos contábeis de forma segura.</p>
        </button>
      </div>
    </div>
  </div>
);

const ExploreView = ({ onStartChat }) => (
  <div className="p-8 max-w-6xl mx-auto">
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Descubra Parceiros</h2>
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar por nome, especialidade ou cargo..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition-colors shadow-sm">
          <Filter size={20} />
          Filtros
        </button>
      </div>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {MOCK_PROFILES.map(profile => (
        <div key={profile.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4 mb-4">
            <img src={profile.avatar} alt={profile.name} className="w-16 h-16 rounded-full border border-slate-100 object-cover" />
            <div>
              <h3 className="font-semibold text-lg text-slate-900">{profile.name}</h3>
              <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{profile.role}</span>
            </div>
          </div>
          <p className="text-slate-600 text-sm mb-6 flex-grow">{profile.desc}</p>
          <button onClick={onStartChat} className="w-full flex justify-center items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-medium transition-colors">
            <MessageSquare size={18} />
            Iniciar Conversa
          </button>
        </div>
      ))}
    </div>
  </div>
);

const ChatView = () => {
  const [proposalAccepted, setProposalAccepted] = useState(false);

  return (
    <div className="h-[calc(100vh-4rem)] flex m-4 rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200">
      {/* Sidebar List */}
      <div className="w-1/3 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="font-semibold text-lg text-slate-900">Conversas</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 bg-indigo-50 cursor-pointer border-l-4 border-indigo-600 flex items-center gap-3">
            <img src={MOCK_PROFILES[0].avatar} className="w-12 h-12 rounded-full" alt="avatar" />
            <div>
              <h4 className="font-medium text-slate-900">{MOCK_PROFILES[0].name}</h4>
              <p className="text-xs text-slate-500 truncate">Proposta enviada</p>
            </div>
          </div>
          <div className="p-4 hover:bg-white cursor-pointer border-l-4 border-transparent flex items-center gap-3 transition-colors">
            <img src={MOCK_PROFILES[1].avatar} className="w-12 h-12 rounded-full" alt="avatar" />
            <div>
              <h4 className="font-medium text-slate-900">{MOCK_PROFILES[1].name}</h4>
              <p className="text-xs text-slate-500 truncate">Podemos marcar uma call?</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Chat Area */}
      <div className="w-2/3 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-white">
          <img src={MOCK_PROFILES[0].avatar} className="w-10 h-10 rounded-full" alt="avatar" />
          <div>
            <h3 className="font-semibold text-slate-900">{MOCK_PROFILES[0].name}</h3>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          <div className="flex flex-col items-start">
            <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm max-w-[80%] text-slate-700">
              Olá! Vi seu perfil e gostaria de ajuda com a conciliação das minhas faturas em USDC.
            </div>
            <span className="text-xs text-slate-400 mt-1 ml-1">10:42 AM</span>
          </div>

          <div className="flex flex-col items-end">
            <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[80%]">
              Olá! Claro, posso te ajudar. Trabalho focado nesse nicho. Vou te enviar uma proposta estruturada.
            </div>
            <span className="text-xs text-slate-400 mt-1 mr-1">10:45 AM</span>
          </div>

          {/* Proposal Component */}
          <div className="flex flex-col items-end mt-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-md w-full max-w-[320px]">
              <div className="flex items-center gap-2 mb-3 text-indigo-600">
                <ShieldCheck size={20} />
                <span className="font-semibold text-sm uppercase tracking-wider">Proposta Comercial</span>
              </div>
              <h4 className="font-medium text-slate-900 mb-1">Assessoria Contábil Web3</h4>
              <p className="text-sm text-slate-500 mb-4">Conciliação mensal, emissão de NF-e e apuração de ganho de capital em USDC.</p>
              <div className="bg-slate-50 p-3 rounded-lg mb-4 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Valor Mensal</span>
                <span className="font-bold text-slate-900">150 USDC</span>
              </div>

              {!proposalAccepted ? (
                <button
                  onClick={() => setProposalAccepted(true)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-medium transition-colors"
                >
                  Aceitar Acordo
                </button>
              ) : (
                <div className="w-full bg-emerald-50 text-emerald-700 py-2.5 rounded-xl font-medium text-center border border-emerald-200 flex items-center justify-center gap-2">
                  <CheckCircle size={18} />
                  Acordo Fechado
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400 mt-1 mr-1">10:48 AM</span>
          </div>

          {proposalAccepted && (
            <div className="flex justify-center mt-6">
              <div className="bg-slate-100 px-4 py-2 rounded-full text-xs font-medium text-slate-500 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500"/>
                Acesso Contábil Liberado pelo Sistema
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-colors">
              <Send size={20} className="ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InvoicesView = () => {
  const getStatusBadge = (status) => {
    switch(status) {
      case 'Pago': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Pago</span>;
      case 'Pendente': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">Pendente</span>;
      case 'Parcial': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">Parcial</span>;
      default: return null;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Histórico Contábil</h2>
          <p className="text-slate-500 mt-1">Gestão de faturas e conciliação em blockchain.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm">
          <Plus size={20} />
          Nova Fatura
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Recebido</p>
              <h3 className="text-3xl font-bold text-slate-900">2,450.00 <span className="text-lg text-slate-400 font-medium">USDC</span></h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Faturas Pendentes</p>
              <h3 className="text-3xl font-bold text-slate-900">2</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <FileText size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Acesso Compartilhado</p>
              <h3 className="text-lg font-bold text-slate-900 mt-2 flex items-center gap-2">
                <img src={MOCK_PROFILES[0].avatar} className="w-8 h-8 rounded-full border border-slate-200" alt="contador"/>
                Contador Ativo
              </h3>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <ShieldCheck size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-medium text-slate-500 uppercase tracking-wider">ID da Fatura</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-500 uppercase tracking-wider">Valor (USDC)</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-500 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-4 text-sm font-medium text-slate-500 uppercase tracking-wider text-right">Comprovante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_INVOICES.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{inv.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{inv.client}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{(inv.amount).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">{getStatusBadge(inv.status)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{inv.date}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    {inv.tx ? (
                      <button className="text-indigo-600 hover:text-indigo-800 flex items-center justify-end gap-1 ml-auto font-medium transition-colors">
                        Ver TX <ExternalLink size={16} />
                      </button>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState('login');
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('explore');

  const handleLogin = () => setCurrentView('role');
  const handleRoleSelection = (role) => { setUserRole(role); setCurrentView('app'); };

  if (currentView === 'login') return <LoginScreen onLogin={handleLogin} />;
  if (currentView === 'role') return <RoleSelectionScreen onSelect={handleRoleSelection} />;

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <nav className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-indigo-600">PeyTrail</h1>
          <p className="text-xs text-slate-500 font-medium uppercase mt-1 tracking-wider">
            {userRole === 'freelancer' ? 'Modo Prestador' : 'Modo Contador'}
          </p>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1">
          <button onClick={() => setActiveTab('explore')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'explore' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <Search size={20} /> Explorar
          </button>
          <button onClick={() => setActiveTab('chat')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'chat' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <MessageSquare size={20} /> Mensagens
            <span className="ml-auto bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">1</span>
          </button>
          <button onClick={() => setActiveTab('invoices')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'invoices' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <FileText size={20} /> Gestão Contábil
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors mt-auto">
            <Settings size={20} /> Configurações
          </button>
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {userRole === 'freelancer' ? 'P' : 'C'}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Meu Perfil</p>
              <button onClick={() => setCurrentView('login')} className="text-xs text-slate-500 hover:text-indigo-600">Sair</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto bg-slate-50/50">
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <h1 className="text-xl font-bold text-indigo-600">PeyTrail</h1>
          <button className="p-2 text-slate-600"><Menu size={24}/></button>
        </div>

        {activeTab === 'explore' && <ExploreView onStartChat={() => setActiveTab('chat')} />}
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'invoices' && <InvoicesView />}
      </main>
    </div>
  );
}
