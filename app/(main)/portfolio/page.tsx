"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Plus, Trash2, ExternalLink, Save, Check, Code2, Eye, Edit3, User, ShieldCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/providers/AppProvider";
import { CATEGORY_IDS } from "@/lib/constants";
import { getCategoryLabel } from "@/lib/utils";

interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link?: string;
  budget?: string;
}

const field = "w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-600 focus:bg-white focus:outline-none text-xs font-medium";
const num = (v: string) => {
  const n = parseInt(v.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

export default function PortfolioPage() {
  const { user } = useApp();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newSkill, setNewSkill] = useState("");

  const [adding, setAdding] = useState(false);
  const [p, setP] = useState({ title: "", description: "", tags: "", link: "", budget: "" });

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("executor_profiles")
      .select("skills, bio, specialization, hourly_rate, min_project_budget, is_open, projects")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSpecialization(data.specialization || "");
          setBio(data.bio || "");
          setHourlyRate(data.hourly_rate ? String(data.hourly_rate) : "");
          setMinBudget(data.min_project_budget ? String(data.min_project_budget) : "");
          setIsOpen(data.is_open !== false);
          setSkills(data.skills || []);
          setProjects(Array.isArray(data.projects) ? data.projects : []);
        }
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("executor_profiles").upsert({
      id: user.id,
      skills,
      bio: bio.trim(),
      specialization: specialization.trim(),
      hourly_rate: num(hourlyRate),
      min_project_budget: num(minBudget),
      is_open: isOpen,
      projects,
    });
    setSaving(false);
    if (err) {
      setError("Не удалось сохранить. Попробуйте ещё раз.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleCategory = (id: string) => {
    const label = getCategoryLabel(id);
    setSkills((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));
  };

  const addSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const v = newSkill.trim();
    if (v && !skills.includes(v)) setSkills([...skills, v]);
    setNewSkill("");
  };

  const addProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p.title.trim() || !p.description.trim()) return;
    setProjects([
      {
        id: `proj-${Date.now()}`,
        title: p.title.trim(),
        description: p.description.trim(),
        tags: p.tags.split(",").map((t) => t.trim()).filter(Boolean),
        link: p.link.trim() || undefined,
        budget: p.budget.trim() ? `${p.budget.trim()} ₽` : undefined,
      },
      ...projects,
    ]);
    setP({ title: "", description: "", tags: "", link: "", budget: "" });
    setAdding(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  const name = user.first_name || "Исполнитель";

  return (
    <div className="space-y-4 pb-24 text-slate-900 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">Портфолио и резюме</h1>
          <p className="text-slate-500 text-xs mt-0.5">Заказчики видят это в каталоге специалистов</p>
        </div>
        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200">
          {(["edit", "preview"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 ${mode === m ? "bg-violet-600 text-white" : "text-slate-500"}`}>
              {m === "edit" ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{m === "edit" ? "Редактор" : "Превью"}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === "preview" ? (
        <div className="bg-white rounded-3xl p-5 border border-purple-200 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xl font-extrabold">{name[0]}</div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-base">{name}</h3>
                  <ShieldCheck className="w-4 h-4 text-violet-600" />
                </div>
                {specialization && <p className="text-violet-700 text-xs font-bold mt-0.5">{specialization}</p>}
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${isOpen ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"}`}>{isOpen ? "Свободен" : "Занят"}</span>
              {num(hourlyRate) ? <div className="text-xs font-extrabold mt-1.5">от {num(hourlyRate)!.toLocaleString("ru-RU")} ₽/час</div> : null}
            </div>
          </div>
          {bio && <div className="bg-slate-50 rounded-2xl p-3.5 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-medium border border-slate-100">{bio}</div>}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span key={s} className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-xl">{s}</span>
              ))}
            </div>
          )}
          {projects.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="text-xs font-extrabold">Проекты ({projects.length})</div>
              {projects.map((pr) => (
                <div key={pr.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <h4 className="font-extrabold text-xs">{pr.title}</h4>
                    {pr.budget && <span className="text-xs font-bold text-violet-700 whitespace-nowrap">{pr.budget}</span>}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{pr.description}</p>
                  {pr.link && (
                    <a href={pr.link} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                      <span>Посмотреть</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-violet-600" /> Основное
              </h2>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <span>Ищу заказы</span>
                <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} className="w-4 h-4 rounded text-violet-600" />
              </label>
            </div>
            <input className={field} value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Специализация, например: Fullstack-разработчик" maxLength={100} />
            <div className="grid grid-cols-2 gap-3">
              <input className={field} inputMode="numeric" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="Ставка в час, ₽" />
              <input className={field} inputMode="numeric" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} placeholder="Мин. бюджет, ₽" />
            </div>
            <textarea className={`${field} resize-none leading-relaxed`} rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="О себе и опыте работы" maxLength={1500} />
          </div>

          <div className="bg-white rounded-3xl p-5 space-y-3.5 border border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-violet-600" /> Направления и навыки
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_IDS.map((id) => {
                const on = skills.includes(getCategoryLabel(id));
                return (
                  <button key={id} type="button" onClick={() => toggleCategory(id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${on ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200"}`}>
                    {getCategoryLabel(id)}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.filter((s) => !CATEGORY_IDS.some((id) => getCategoryLabel(id) === s)).map((s) => (
                <span key={s} className="bg-slate-100 text-slate-800 text-xs font-bold py-1 pl-2.5 pr-1.5 rounded-xl flex items-center gap-1 border border-slate-200">
                  {s}
                  <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} className="p-0.5 rounded-md hover:bg-slate-300 text-slate-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={addSkill} className="flex gap-2">
              <input className={field} value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Добавить навык (React, Figma, SMM...)" maxLength={40} />
              <button type="submit" disabled={!newSkill.trim()} className="btn-primary px-4 rounded-2xl text-xs font-bold disabled:opacity-50">
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl p-5 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-violet-600" /> Проекты ({projects.length})
              </h2>
              {!adding && (
                <button type="button" onClick={() => setAdding(true)} className="btn-primary text-xs font-extrabold py-2 px-3 rounded-xl flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Кейс
                </button>
              )}
            </div>

            <AnimatePresence>
              {adding && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={addProject} className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-2.5 overflow-hidden">
                  <input className={field} value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} placeholder="Название проекта *" required />
                  <textarea className={`${field} resize-none`} rows={3} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} placeholder="Что сделано и какой результат *" required />
                  <div className="grid grid-cols-2 gap-2">
                    <input className={field} value={p.tags} onChange={(e) => setP({ ...p, tags: e.target.value })} placeholder="Теги через запятую" />
                    <input className={field} value={p.budget} onChange={(e) => setP({ ...p, budget: e.target.value })} placeholder="Бюджет, ₽" />
                  </div>
                  <input className={field} type="url" value={p.link} onChange={(e) => setP({ ...p, link: e.target.value })} placeholder="Ссылка (https://...)" />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 btn-primary py-2.5 rounded-xl text-xs font-extrabold">Добавить</button>
                    <button type="button" onClick={() => setAdding(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">Отмена</button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {projects.length === 0 && !adding && <p className="text-xs text-slate-400 font-medium">Добавьте примеры работ — это повышает доверие заказчиков.</p>}
            {projects.map((pr) => (
              <div key={pr.id} className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-xs">{pr.title}</h3>
                    {pr.budget && <span className="text-[11px] font-extrabold text-violet-700">{pr.budget}</span>}
                  </div>
                  <button type="button" onClick={() => setProjects(projects.filter((x) => x.id !== pr.id))} className="text-slate-400 hover:text-red-600 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{pr.description}</p>
              </div>
            ))}
          </div>

          {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
          <button onClick={save} disabled={saving} className="w-full btn-primary py-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-violet disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 stroke-[3]" /> : <Save className="w-4 h-4" />}
            <span>{saved ? "Сохранено!" : "Сохранить"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
