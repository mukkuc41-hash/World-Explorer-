import React from 'react';
import { motion } from 'motion/react';
import { X, Shield, ScrollText, Check } from 'lucide-react';
import GlobalRotatingEarth from './GlobalRotatingEarth.tsx';

interface TermsModalProps {
  onAccept: () => void;
}

export default function TermsModal({ onAccept }: TermsModalProps) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <GlobalRotatingEarth />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-[#f5f5f0]/80 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-white rounded-[48px] shadow-2xl overflow-hidden border border-[#141414]/5 flex flex-col max-h-[90vh]"
      >
        <div className="p-8 md:p-12 border-b border-[#141414]/5 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#141414] rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-sans font-bold tracking-tight text-[#141414]">Legal & Privacy</h2>
              <p className="text-[10px] uppercase tracking-widest font-black opacity-30 mt-1">Review our guidelines</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar space-y-12">
          {/* Privacy Policy */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#00af87]" />
              <h3 className="text-2xl font-serif italic text-[#141414]">Privacy Policy</h3>
            </div>
            <div className="text-[10px] uppercase tracking-widest font-black opacity-40">Last Updated: May 2026</div>
            <div className="prose prose-sm prose-slate max-w-none text-[#141414]/70 leading-relaxed space-y-6">
              <p>Welcome to World Explorer ("we," "our," or "us"). We are highly committed to protecting your personal information and your right to privacy. If you have any questions, concerns, or feedback regarding this privacy notice or our data handling practices, please contact us at <span className="font-bold text-[#141414]">mukkuc41@gmail.com</span>.</p>
              
              <div className="space-y-4">
                <h4 className="text-[#141414] font-black uppercase tracking-widest text-[10px]">Information We Collect</h4>
                <p>We only collect information that you directly provide to us, or data that is automatically generated when you browse our platform:</p>
                <ul className="list-disc pl-5 space-y-3">
                  <li><strong>Voluntary Communication Data:</strong> If you contact us directly via email for support, content inquiries, or feedback, we collect your email address and any text or attachments you choose to send.</li>
                  <li><strong>Usage and Log Data:</strong> Our web hosting servers automatically record standard internet log data when you access World Explorer. This includes your device's anonymized IP address, browser type, operating system, referring pages, and the specific timestamps of your visits.</li>
                  <li><strong>Cookies:</strong> We use basic browser cookies to enhance performance, save user interface preferences, and analyze generalized, aggregated traffic patterns.</li>
                </ul>

                <h4 className="text-[#141414] font-black uppercase tracking-widest text-[10px]">How We Use Your Information</h4>
                <p>The details we collect are used strictly to:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Maintain, secure, optimize, and improve the World Explorer platform.</li>
                  <li>Respond to user inquiries and provide support via email.</li>
                  <li>Monitor site traffic trends to ensure backend server stability and smooth performance.</li>
                  <li>Protect our website against cyber threats, automated spam, and abuse.</li>
                </ul>

                <h4 className="text-[#141414] font-black uppercase tracking-widest text-[10px]">Data Protection and Sharing</h4>
                <p>We implement industry-standard security practices to keep your data safe. World Explorer does not sell, rent, trade, or share your personal information with third-party companies.</p>

                <h4 className="text-[#141414] font-black uppercase tracking-widest text-[10px]">Third-Party Links & Integrations</h4>
                <p>As a platform exploring the world, our website may contain links to external websites, maps, or media services. We do not control or operate these third-party platforms, and we strongly recommend reviewing their respective privacy policies when visiting them.</p>

                <h4 className="text-[#141414] font-black uppercase tracking-widest text-[10px]">Updates to This Policy</h4>
                <p>We reserve the right to update this Privacy Policy at any time. Any changes will be updated on this page with a revised "Last Updated" date.</p>
              </div>
            </div>
          </section>

          <div className="h-px bg-[#141414]/5" />

          {/* Terms & Conditions */}
          <section className="space-y-6 pb-12">
            <div className="flex items-center gap-3">
              <ScrollText className="w-5 h-5 text-[#5A5A40]" />
              <h3 className="text-2xl font-serif italic text-[#141414]">Terms & Conditions (Rules & Regulations)</h3>
            </div>
            <div className="text-[10px] uppercase tracking-widest font-black opacity-40">Last Updated: May 2026</div>
            <div className="prose prose-sm prose-slate max-w-none text-[#141414]/70 leading-relaxed space-y-6">
              <p>Please read these Terms & Conditions carefully before using the website operated by World Explorer (the "Service"). By accessing or using our website, you agree to be bound by these rules. If you disagree with any part of these terms, you do not have permission to access the Service.</p>

              <div className="space-y-4">
                <h4 className="text-[#141414] font-black uppercase tracking-widest text-[10px]">Intellectual Property Rights</h4>
                <p>The Service and its original features, custom web tools, code architecture, written content, UI design, and platform imagery are the exclusive property of World Explorer and its creators. Unauthorized duplication, modification, web scraping, or commercial distribution of our platform assets is strictly prohibited without explicit written consent.</p>

                <h4 className="text-[#141414] font-black uppercase tracking-widest text-[10px]">Prohibited User Conduct</h4>
                <p>To ensure a secure environment for all users, you agree not to engage in any of the following activities:</p>
                <ul className="list-disc pl-5 space-y-3">
                  <li><strong>Automated Scraping:</strong> Using scrapers, crawlers, bots, or custom automated scripts to extract data, media, or content from World Explorer.</li>
                  <li><strong>Infrastructure Abuse:</strong> Flooding our servers with excessive queries, DDOS attempts, or actions that intentionally slow down site performance.</li>
                  <li><strong>Malicious Injections:</strong> Attempting to upload or inject malicious code, scripts, viruses, or trojans into the website interface or backend.</li>
                </ul>

                <h4 className="text-[#141414] font-black uppercase tracking-widest text-[10px]">Disclaimer of Warranties</h4>
                <p>The tools, information, and features on World Explorer are provided on an "AS IS" and "AS AVAILABLE" basis. World Explorer makes no warranties, expressed or implied, regarding the absolute accuracy, completeness, or reliability of any data, content, or external links hosted on the platform. You utilize the platform's resources entirely at your own risk.</p>

                <h4 className="text-[#141414] font-black uppercase tracking-widest text-[10px]">Limitation of Liability</h4>
                <p>In no event shall World Explorer, its creators, or its affiliates be held liable for any direct, indirect, incidental, or consequential damages resulting from your access to, use of, or inability to access our platform or tools.</p>

                <h4 className="text-[#141414] font-black uppercase tracking-widest text-[10px]">Governing Law</h4>
                <p>These Terms shall be governed and construed in accordance with the laws of <span className="font-bold text-[#141414]">Rajasthan, India</span>, without regard to its conflict of law provisions. Any legal actions or disputes related to World Explorer must be filed exclusively in the courts located within that jurisdiction.</p>

                <h4 className="text-[#141414] font-black uppercase tracking-widest text-[10px]">Contact Us</h4>
                <p>For any clarifications regarding these Terms and Conditions, please reach out to us at <span className="font-bold text-[#141414]">mukkuc41@gmail.com</span>.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="p-8 bg-white border-t border-[#141414]/5">
          <button
            onClick={onAccept}
            className="w-full bg-[#141414] text-white py-5 rounded-[24px] font-bold text-lg uppercase tracking-widest hover:bg-[#333] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <Check className="w-6 h-6" /> I Agree to Terms & Privacy
          </button>
        </div>
      </motion.div>
    </div>
  );
}
