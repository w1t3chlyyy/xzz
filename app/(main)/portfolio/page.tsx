"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getTelegramUser } from "@/lib/telegram/webapp";
import {
  Briefcase,
  Plus,
  Trash2,
  ExternalLink,
  Save,
  Check,
  Award,
  Code2,
  Eye,
  Edit3,
  DollarSign,
  User,
  ShieldCheck,
} from "lucide-react";

interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  link?: string;
  budget?: string;
  date?: string;
}

const DEFAULT_SKILLS = [
  "Telegram Mini Apps",
  "React / Next.js",
  "TypeScript",
  "Node.js",
  "Python (aiogram)",
  "TON Web3 / Jettons",
  "PostgreSQL / Supabase",
  "Tailwind CSS",
  "Figma UI/UX",
];

const INITIAL_PROJECTS: PortfolioProject[] = [
  {
    id: "p-1",
    title: "Telegram Mini App: Крипто-рулетка и Stars",
    description: "Полнофункциональное Mini App приложение с авторизацией через Telegram, колесом фортуны и выплатами призов через Stars и TON API.",
    category: "programming",
    tags: ["Next.js", "TypeScript", "TON API", "Tailwind"],
    link: "https://t.me/demo_roulette_bot",
    budget: "45 000 ₽",
    date: "Февраль 2026",
  },
  {
    id: "p-2",
    title: "AI-Бот для генерации лидов и CRM",
    description: "Telegram-бот с интеграцией Gemini AI для автоматической квалификации клиентов, ответов на частые вопросы и записи в CRM базу.",
    category: "programming",
    tags: ["Python", "aiogram 3", "Gemini AI", "PostgreSQL"],
    link: "https://t.me/demo_ai_crm_bot",
    budget: "32 000 ₽",
    date: "Январь 2026",
  },
  {
    id: "p-3",
    title: "UI/UX Дизайн биржи и личного кабинета",
    description: "Проработка дизайн-системы, мобильных прототипов и светлой/темной темы в Figma для финтех-сервиса.",
    category: "design",
    tags: ["Figma", "Design System", "Mobile UI"],
    link: "https://figma.com",
    budget: "28 000 ₽",
    date: "Декабрь 2025",
  },
];

export default function PortfolioPage() {
  const [role, setRole] = useState<string>("executor");
  const [name, setName] = useState("Исполнитель");
  const [username, setUsername] = useState("alex_code");
  const [specialization, setSpecialization] = useState("Full-Stack разработчик Telegram Mini Apps & Ботов");
  const [bio, setBio] = useState(
    "Разрабатываю быстрые и конвертящие Telegram WebApp, боты на aiogram/Node.js и web-сервисы с AI автоматизацией под ключ. 3+ года коммерческого опыта, чистый код и соблюдение дедлайнов."
  );
  const [hourlyRate, setHourlyRate] = useState("2 000");
  const [minProjectBudget, setMinProjectBudget] = useState("20 000");
  const [skills, setSkills] = useState<string[]>(DEFAULT_SKILLS);
  const [newSkill, setNewSkill] = useState("");
  const [isOpenForOrders, setIsOpenForOrders] = useState(true);
  const [projects, setProjects] = useState<PortfolioProject[]>(INITIAL_PROJECTS);

  // New Project Form State
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjTitle, setNewProjTitle] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjTags, setNewProjTags] = useState("");
  const [newProjLink, setNewProjLink] = useState("");
  const [newProjBudget, setNewProjBudget] = useState("");

  const [isSaved, setIsSaved] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  const supabase = createClient();

  useEffect(() => {
    const savedRole = localStorage.getItem("1337_role") || localStorage.getItem("fiolet_role") || "executor";
    setRole(savedRole);

    // Extract Telegram profile
    const tgUser = getTelegramUser();
    if (tgUser) {
      if (tgUser.displayName) setName(tgUser.displayName);
      if (tgUser.username) setUsername(tgUser.username.replace(/^@/, ""));
    }

    const savedPortfolio = localStorage.getItem("1337_executor_portfolio") || localStorage.getItem("fiolet_executor_portfolio");
    if (savedPortfolio) {
      try {
        const parsed = JSON.parse(savedPortfolio);
        if (parsed.name && !tgUser?.displayName) setName(parsed.name);
        if (parsed.username && !tgUser?.username) setUsername(parsed.username);
        if (parsed.specialization) setSpecialization(parsed.specialization);
        if (parsed.bio) setBio(parsed.bio);
        if (parsed.hourlyRate) setHourlyRate(parsed.hourlyRate);
        if (parsed.minProjectBudget) setMinProjectBudget(parsed.minProjectBudget);
        if (parsed.skills) setSkills(parsed.skills);
        if (parsed.projects) setProjects(parsed.projects);
        if (parsed.isOpenForOrders !== undefined) setIsOpenForOrders(parsed.isOpenForOrders);
      } catch (e) {
        console.warn("Error reading cached portfolio:", e);
      }
    }

    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          if (userData) {
            if (userData.first_name && !tgUser?.displayName) setName(userData.first_name);
            if (userData.username && !tgUser?.username) setUsername(userData.username);
          }

          const { data: execData } = await supabase
            .from("executor_profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (execData) {
            if (execData.bio) setBio(execData.bio);
            if (execData.skills && execData.skills.length > 0) setSkills(execData.skills);
          }
        }
      } catch (err) {
        console.warn("User load error:", err);
      }
    }

    loadUser();
  }, [supabase]);

  const handleSave = async () => {
    const payload = {
      specialization,
      bio,
      hourlyRate,
      minProjectBudget,
      skills,
      projects,
      isOpenForOrders,
    };
    localStorage.setItem("fiolet_executor_portfolio", JSON.stringify(payload));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("executor_profiles").upsert({
          id: user.id,
          skills,
          bio,
          rating: 5.0,
          completed_orders: projects.length + 12,
        });
      }
    } catch (e) {
      console.warn("Save to db fallback:", e);
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    if (!skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjTitle.trim() || !newProjDesc.trim()) return;

    const parsedTags = newProjTags
      ? newProjTags.split(",").map((t) => t.trim()).filter(Boolean)
      : ["Telegram", "Разработка"];

    const newProject: PortfolioProject = {
      id: `proj-${Date.now()}`,
      title: newProjTitle,
      description: newProjDesc,
      category: "programming",
      tags: parsedTags,
      link: newProjLink || undefined,
      budget: newProjBudget ? `${newProjBudget} ₽` : undefined,
      date: "Недавно",
    };

    const updatedProjects = [newProject, ...projects];
    setProjects(updatedProjects);
    setIsAddingProject(false);
    setNewProjTitle("");
    setNewProjDesc("");
    setNewProjTags("");
    setNewProjLink("");
    setNewProjBudget("");

    localStorage.setItem(
      "fiolet_executor_portfolio",
      JSON.stringify({
        specialization,
        bio,
        hourlyRate,
        minProjectBudget,
        skills,
        projects: updatedProjects,
        isOpenForOrders,
      })
    );
  };

  const handleDeleteProject = (projectId: string) => {
    const updated = projects.filter((p) => p.id !== projectId);
    setProjects(updated);
  };

  return (
    <div className="space-y-4 pb-24 text-slate-900 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>Портфолио и Резюме</span>
            <span className="badge-violet text-[10px] font-extrabold py-0.5 px-2 rounded-lg">
              PRO
            </span>
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Заполните резюме и кейсы, чтобы получать заказы напрямую
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setPreviewMode("edit")}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              previewMode === "edit"
                ? "bg-violet-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Редактор</span>
          </button>
          <button
            onClick={() => setPreviewMode("preview")}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              previewMode === "preview"
                ? "bg-violet-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Превью</span>
          </button>
        </div>
      </div>

      {/* Role Banner Warning for Executors */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-violet-700 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900">
              Ваш профиль в каталоге исполнителей
            </div>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
              Заказчики просматривают ваше портфолио перед выбором отклика
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="btn-primary text-xs font-extrabold py-2 px-3 rounded-xl shrink-0 flex items-center gap-1 shadow-violet"
        >
          {isSaved ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaved ? "Сохранено" : "Сохранить"}</span>
        </button>
      </div>

      {previewMode === "preview" ? (
        /* Preview Card */
        <div className="bg-white rounded-3xl p-5 border border-purple-200 shadow-[0_4px_25px_rgba(124,58,237,0.06)] space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xl font-extrabold shadow-sm">
                {name[0] || "A"}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-base text-slate-900">{name}</h3>
                  <ShieldCheck className="w-4 h-4 text-violet-600" />
                </div>
                <p className="text-slate-400 text-xs font-medium">@{username}</p>
                <p className="text-violet-700 text-xs font-bold mt-0.5">{specialization}</p>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                isOpenForOrders
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOpenForOrders ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                {isOpenForOrders ? "Свободен для заказов" : "Занят"}
              </span>
              <div className="text-xs font-extrabold text-slate-900 mt-1.5">
                от {hourlyRate} ₽/час
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3.5 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-medium border border-slate-100">
            {bio}
          </div>

          <div>
            <div className="text-xs font-extrabold text-slate-900 mb-2">Навыки и стек:</div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-xl shadow-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-extrabold text-slate-900 mb-3">
              Проекты в портфолио ({projects.length})
            </div>
            <div className="space-y-3">
              {projects.map((p) => (
                <div key={p.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-xs text-slate-900">{p.title}</h4>
                    {p.budget && (
                      <span className="text-xs font-bold text-violet-700 whitespace-nowrap">
                        {p.budget}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    {p.description}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-1">
                      {p.tags.map((t, i) => (
                        <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                    {p.link && (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-blue-600 flex items-center gap-1 hover:underline"
                      >
                        <span>Посмотреть кейс</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div className="space-y-4">
          {/* Main Info Card */}
          <div className="bg-white rounded-3xl p-5 space-y-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-violet-600" />
                Основная информация
              </h2>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <span>Ищу заказы</span>
                <input
                  type="checkbox"
                  checked={isOpenForOrders}
                  onChange={(e) => setIsOpenForOrders(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">
                Специализация / Направление
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="Например: Fullstack разработчик Telegram Mini Apps"
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none text-xs font-medium transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Ставка в час (₽)
                </label>
                <input
                  type="text"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="2 000"
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Мин. бюджет проекта (₽)
                </label>
                <input
                  type="text"
                  value={minProjectBudget}
                  onChange={(e) => setMinProjectBudget(e.target.value)}
                  placeholder="15 000"
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-900">
                  О себе и опыт работы
                </label>
              </div>

              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Расскажите о вашем опыте, выполненных задачах, преимуществах..."
                rows={4}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none text-xs font-medium leading-relaxed resize-none transition-all"
              />
            </div>
          </div>

          {/* Skills & Stack Card */}
          <div className="bg-white rounded-3xl p-5 space-y-3.5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-violet-600" />
              Навыки и стек технологий
            </h2>

            {/* Existing Skills */}
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold py-1 pl-2.5 pr-1.5 rounded-xl flex items-center gap-1 border border-slate-200 transition-colors"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="p-0.5 rounded-md hover:bg-slate-300 text-slate-500 hover:text-slate-800"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add Skill Input */}
            <form onSubmit={handleAddSkill} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Добавить навык (например: Docker, TON, GraphQL)"
                className="flex-1 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none text-xs font-medium"
              />
              <button
                type="submit"
                disabled={!newSkill.trim()}
                className="btn-primary px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить</span>
              </button>
            </form>
          </div>

          {/* Portfolio Projects Section */}
          <div className="bg-white rounded-3xl p-5 space-y-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-violet-600" />
                  Мои проекты и кейсы ({projects.length})
                </h2>
                <p className="text-slate-400 text-[11px] font-medium mt-0.5">
                  Примеры реальных работ повышают доверие заказчиков в 3 раза
                </p>
              </div>

              {!isAddingProject && (
                <button
                  type="button"
                  onClick={() => setIsAddingProject(true)}
                  className="btn-primary text-xs font-extrabold py-2 px-3 rounded-xl flex items-center gap-1 shadow-violet"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Кейс</span>
                </button>
              )}
            </div>

            {/* Add Project Form Modal/Inline */}
            <AnimatePresence>
              {isAddingProject && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateProject}
                  className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                    <span className="text-xs font-extrabold text-slate-900">
                      Новый кейс в портфолио
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingProject(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      Отмена
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Название проекта *
                    </label>
                    <input
                      type="text"
                      value={newProjTitle}
                      onChange={(e) => setNewProjTitle(e.target.value)}
                      placeholder="Например: Разработка Telegram Mini App криптобиржи"
                      className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-slate-900 text-xs font-medium focus:border-violet-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Описание задачи и результатов *
                    </label>
                    <textarea
                      value={newProjDesc}
                      onChange={(e) => setNewProjDesc(e.target.value)}
                      placeholder="Что было сделано, какой стек использован, какие задачи решены..."
                      rows={3}
                      className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-slate-900 text-xs font-medium focus:border-violet-600 focus:outline-none resize-none leading-relaxed"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Теги (через запятую)
                      </label>
                      <input
                        type="text"
                        value={newProjTags}
                        onChange={(e) => setNewProjTags(e.target.value)}
                        placeholder="Next.js, TON, Tailwind"
                        className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-slate-900 text-xs font-medium focus:border-violet-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Бюджет кейса
                      </label>
                      <input
                        type="text"
                        value={newProjBudget}
                        onChange={(e) => setNewProjBudget(e.target.value)}
                        placeholder="Например: 35 000"
                        className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-slate-900 text-xs font-medium focus:border-violet-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Ссылка на демо / бота / GitHub
                    </label>
                    <input
                      type="url"
                      value={newProjLink}
                      onChange={(e) => setNewProjLink(e.target.value)}
                      placeholder="https://t.me/my_bot"
                      className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-slate-900 text-xs font-medium focus:border-violet-600 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-primary py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-violet mt-2"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Добавить кейс в резюме</span>
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* List of Existing Projects */}
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-2.5 hover:border-purple-300 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900">
                        {project.title}
                      </h3>
                      {project.budget && (
                        <span className="text-[11px] font-extrabold text-violet-700">
                          {project.budget}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors"
                      title="Удалить кейс"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                    <div className="flex flex-wrap gap-1">
                      {project.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {project.link && (
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span>Ссылка</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Save Action */}
          <button
            onClick={handleSave}
            className="w-full btn-primary py-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-violet"
          >
            {isSaved ? <Check className="w-4 h-4 stroke-[3]" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? "Изменения сохранены!" : "Сохранить портфолио и резюме"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
