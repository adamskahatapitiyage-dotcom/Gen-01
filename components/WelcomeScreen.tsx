import React from 'react';

const SparklesIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

const ImageIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w.3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
);

const CheckBadgeIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);


interface WelcomeScreenProps {
    onGetStarted: () => void;
}

const FeatureCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
}> = ({ icon, title, description }) => (
    <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800 text-center flex flex-col items-center">
        <div className="mb-4 text-cyan-400">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400">{description}</p>
    </div>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] text-center p-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-6xl p-4 inline-block mb-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 font-black text-slate-900 shadow-lg">
                    AR
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                    Welcome to the AI Attribute Rule Generator
                </h1>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12">
                    An intelligent assistant to help you build clear, consistent, and powerful product tagging rules with ease.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <FeatureCard
                        icon={<SparklesIcon className="w-10 h-10" />}
                        title="Generate with Precision"
                        description="Input categories and values to create detailed, consistent tagging rules from scratch."
                    />
                    <FeatureCard
                        icon={<ImageIcon className="w-10 h-10" />}
                        title="Enhance with Vision"
                        description="Add images for context or use OCR to extract data directly from documents and screenshots."
                    />
                    <FeatureCard
                        icon={<CheckBadgeIcon className="w-10 h-10" />}
                        title="Refine & Test"
                        description="Edit, refine, and test your generated rules against sample data to ensure complete accuracy."
                    />
                </div>

                <button
                    onClick={onGetStarted}
                    className="px-8 py-4 text-lg font-bold rounded-lg shadow-lg text-white bg-gradient-to-br from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 transform hover:scale-105 transition-transform duration-200"
                >
                    Start Building Rules
                </button>
            </div>
        </div>
    );
};

export default WelcomeScreen;