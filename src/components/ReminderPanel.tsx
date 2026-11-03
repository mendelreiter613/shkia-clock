"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Check, Loader2, Monitor, Share, Smartphone, SquarePlus, X } from "lucide-react";
import { REMINDER_MINUTES } from "@/lib/reminders";
import { DeviceSupport, getDeviceSupport, getInstallPrompt, onInstallPromptChange } from "@/lib/pushClient";
import { RemindersState } from "@/hooks/useReminders";

interface ReminderPanelProps {
    reminders: RemindersState;
    locationName: string;
    onClose: () => void;
}

export default function ReminderPanel({ reminders, locationName, onClose }: ReminderPanelProps) {
    const { prefs, busy, error, enableTab, enablePush, disable, setMinutes } = reminders;
    const [support, setSupport] = useState<DeviceSupport | null>(null);
    const [canInstall, setCanInstall] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability checks need window
        setSupport(getDeviceSupport());
        setCanInstall(!!getInstallPrompt());
        return onInstallPromptChange(() => setCanInstall(!!getInstallPrompt()));
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const install = async () => {
        const prompt = getInstallPrompt();
        if (!prompt) return;
        await prompt.prompt();
        await prompt.userChoice;
        setCanInstall(!!getInstallPrompt());
    };

    const needsHomeScreen = support?.isIOS && !support.isStandalone;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="reminder-title"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-slate-900/95 border border-white/10 shadow-2xl p-6 text-white"
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/15">
                            <Bell className="w-5 h-5 text-blue-300" />
                        </div>
                        <h2 id="reminder-title" className="text-lg font-semibold">Shachris reminder</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close">
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                <p className="text-sm text-white/60 mb-3">Remind me before shkia in {locationName}:</p>
                <div className="grid grid-cols-3 gap-2 mb-6" role="radiogroup" aria-label="Minutes before shkia">
                    {REMINDER_MINUTES.map((m) => (
                        <button
                            key={m}
                            role="radio"
                            aria-checked={prefs.minutes === m}
                            disabled={busy}
                            onClick={() => setMinutes(m)}
                            className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${prefs.minutes === m
                                ? "bg-blue-500/20 border-blue-400/50 text-white"
                                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                                }`}
                        >
                            {m} min
                        </button>
                    ))}
                </div>

                <div className="space-y-3">
                    {/* Option 1: in-tab */}
                    <OptionCard
                        icon={<Monitor className="w-5 h-5 text-emerald-300" />}
                        title="While this page is open"
                        description="Nothing to install. Only works while Shkia Clock stays open in a tab. If you close it, no reminder."
                        active={prefs.mode === "tab"}
                    >
                        {support && !support.notifications ? (
                            <p className="text-xs text-white/50">This browser doesn&apos;t support notifications.</p>
                        ) : (
                            <ActionButton active={prefs.mode === "tab"} busy={busy} onClick={enableTab} />
                        )}
                    </OptionCard>

                    {/* Option 2: push */}
                    <OptionCard
                        icon={<Smartphone className="w-5 h-5 text-purple-300" />}
                        title="Every day, even when closed"
                        description="A real notification on your phone or computer every day, whether or not the site is open."
                        active={prefs.mode === "push"}
                    >
                        {!support ? null : needsHomeScreen ? (
                            <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/80 space-y-2.5">
                                <p className="font-semibold text-white">On iPhone, add the app to your home screen first:</p>
                                <Step n={1}>Tap <Share className="inline w-4 h-4 -mt-0.5 mx-0.5" /> <b>Share</b> at the bottom of Safari</Step>
                                <Step n={2}>Choose <SquarePlus className="inline w-4 h-4 -mt-0.5 mx-0.5" /> <b>Add to Home Screen</b></Step>
                                <Step n={3}>Open <b>Shkia Clock</b> from your home screen and turn this on there</Step>
                                <p className="text-xs text-white/50 pt-1">Needs iOS 16.4 or newer.</p>
                            </div>
                        ) : !support.push ? (
                            <p className="text-xs text-white/50">
                                This browser can&apos;t get notifications while the site is closed. Try Chrome, Edge, Firefox, or Safari on a Mac.
                            </p>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2">
                                <ActionButton active={prefs.mode === "push"} busy={busy} onClick={enablePush} />
                                {canInstall && !support.isStandalone && (
                                    <button
                                        onClick={install}
                                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                    >
                                        Install the app
                                    </button>
                                )}
                            </div>
                        )}
                    </OptionCard>
                </div>

                {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

                {prefs.mode !== "off" && (
                    <div className="mt-5 flex items-center justify-between text-sm">
                        <span className="text-white/50">
                            {prefs.mode === "tab" ? "In-tab" : "Daily"} reminder on, {prefs.minutes} min before shkia
                        </span>
                        <button onClick={disable} disabled={busy} className="text-white/70 underline underline-offset-4 hover:text-white">
                            Turn off
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

function OptionCard({ icon, title, description, active, children }: {
    icon: React.ReactNode; title: string; description: string; active: boolean; children: React.ReactNode;
}) {
    return (
        <div className={`rounded-2xl border p-4 transition-colors ${active ? "border-blue-400/50 bg-blue-500/10" : "border-white/10 bg-white/[0.03]"}`}>
            <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-xl bg-white/5 shrink-0">{icon}</div>
                <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-white/55 mt-0.5">{description}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

function ActionButton({ active, busy, onClick }: { active: boolean; busy: boolean; onClick: () => void }) {
    if (active) {
        return (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500/15 text-emerald-300">
                <Check className="w-4 h-4" /> On
            </span>
        );
    }
    return (
        <button
            onClick={onClick}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-400 disabled:opacity-60 transition-colors"
        >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Turn on
        </button>
    );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
    return (
        <p className="flex gap-2.5">
            <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 text-xs flex items-center justify-center font-semibold">{n}</span>
            <span>{children}</span>
        </p>
    );
}
