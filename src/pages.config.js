import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import GapAnalyzer from './pages/GapAnalyzer';
import KnowledgeGraph from './pages/KnowledgeGraph';
import Memory from './pages/Memory';
import Projects from './pages/Projects';
import ResearchChat from './pages/ResearchChat';
import ResearchCouncil from './pages/ResearchCouncil';
import VivaSimulator from './pages/VivaSimulator';
import Writing from './pages/Writing';
import PaperSearch from './pages/PaperSearch';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Dashboard": Dashboard,
    "Documents": Documents,
    "GapAnalyzer": GapAnalyzer,
    "KnowledgeGraph": KnowledgeGraph,
    "Memory": Memory,
    "Projects": Projects,
    "ResearchChat": ResearchChat,
    "ResearchCouncil": ResearchCouncil,
    "VivaSimulator": VivaSimulator,
    "Writing": Writing,
    "PaperSearch": PaperSearch,
}

export const pagesConfig = {
    mainPage: "Projects",
    Pages: PAGES,
    Layout: __Layout,
};