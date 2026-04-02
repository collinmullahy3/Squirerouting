import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  CheckCircle2, 
  BarChart3, 
  GitPullRequest, 
  Users,
  Brain,
  Zap,
  Mail,
  Phone,
  User
} from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navigation */}
      <header className="w-full py-4 px-4 md:px-8 border-b border-gray-200 sticky top-0 bg-white z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
           <img src="https://i.imgur.com/UX6uPj3.png" alt="Squire Logo" className="h-36 w-auto" />
          </div>
          <div className="hidden md:flex space-x-6">
            <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/login")}
            >
              Login
            </Button>
            <Button 
              onClick={() => setShowContactForm(true)}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full py-20 px-4 md:px-8 bg-gradient-to-br from-[#EDE8DF] to-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Automate Your Real Estate Lead Routing
            </h1>
            <p className="text-xl text-gray-600">
              Squire helps real estate teams convert more leads with AI-powered routing, 
              automated follow-up, and intelligent performance tracking.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
              <Button 
                size="lg" 
                onClick={() => setShowContactForm(true)}
                className="bg-[#6A584C] hover:bg-[#3A2F28] text-white"
              >
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => setLocation("/apartments")}
              >
                View Demo Properties
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -z-10 w-72 h-72 bg-[#C9AD6A]/30 rounded-full -top-10 -right-10 blur-3xl"></div>
            <img 
              src="/attached_assets/Squire.png" 
              alt="Squire Dashboard" 
              className="rounded-lg shadow-2xl border border-gray-200 w-full"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-20 px-4 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Leads
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our all-in-one platform helps real estate teams capture, route, and convert more leads with less work.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
              <div className="bg-[#6A584C]/10 p-3 rounded-lg inline-block mb-4">
                <GitPullRequest className="h-8 w-8 text-[#6A584C]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Intelligent Lead Routing
              </h3>
              <p className="text-gray-600">
                Automatically route leads to the right agent based on location, price point, and availability using smart round-robin assignment.
              </p>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
              <div className="bg-[#6A584C]/10 p-3 rounded-lg inline-block mb-4">
                <Brain className="h-8 w-8 text-[#6A584C]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                AI-Powered Message Parsing
              </h3>
              <p className="text-gray-600">
                Our AI reads incoming lead emails from any source — Zillow, StreetEasy, Zumper, and more — and accurately extracts contact details, property preferences, and budget for precise lead delivery.
              </p>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
              <div className="bg-[#6A584C]/10 p-3 rounded-lg inline-block mb-4">
                <BarChart3 className="h-8 w-8 text-[#6A584C]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                AI Performance Insights
              </h3>
              <p className="text-gray-600">
                Go beyond basic reports. Our AI analyzes agent performance, lead conversion trends, and source quality to surface actionable insights that help your team close more deals.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
              <div className="bg-[#6A584C]/10 p-3 rounded-lg inline-block mb-4">
                <Users className="h-8 w-8 text-[#6A584C]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Team Collaboration
              </h3>
              <p className="text-gray-600">
                Share leads, notes, and insights across your team to improve coordination and close rates.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
              <div className="bg-[#6A584C]/10 p-3 rounded-lg inline-block mb-4">
                <Zap className="h-8 w-8 text-[#6A584C]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Instant Notifications
              </h3>
              <p className="text-gray-600">
                Agents receive instant email notifications the moment a lead is assigned, with all the details they need to follow up fast.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
              <div className="bg-[#6A584C]/10 p-3 rounded-lg inline-block mb-4">
                <Mail className="h-8 w-8 text-[#6A584C]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Multi-Source Integration
              </h3>
              <p className="text-gray-600">
                Connect leads from Zillow, StreetEasy, Zumper, Trulia, Apartments.com, and any other platform that sends email inquiries.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section id="how-it-works" className="w-full py-20 px-4 md:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How Squire Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our simple process helps you capture and convert more leads with less effort.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="bg-white p-8 rounded-lg border border-gray-200 relative z-10">
                <div className="absolute -top-5 -left-5 bg-[#C9AD6A] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl">
                  1
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 mt-4">
                  Capture Leads
                </h3>
                <p className="text-gray-600">
                  Forward incoming lead emails to Squire. Our AI instantly parses the message — extracting name, contact info, budget, and property preferences — no matter the source.
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 z-0">
                <ArrowRight className="h-8 w-8 text-gray-300" />
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white p-8 rounded-lg border border-gray-200 relative z-10">
                <div className="absolute -top-5 -left-5 bg-[#C9AD6A] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl">
                  2
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 mt-4">
                  Route Intelligently
                </h3>
                <p className="text-gray-600">
                  Squire matches each lead to the right agent group based on zip code, price range, and custom rules — then assigns using fair round-robin rotation.
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 z-0">
                <ArrowRight className="h-8 w-8 text-gray-300" />
              </div>
            </div>
            
            <div>
              <div className="bg-white p-8 rounded-lg border border-gray-200">
                <div className="absolute -top-5 -left-5 bg-[#C9AD6A] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl">
                  3
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 mt-4">
                  Convert More Clients
                </h3>
                <p className="text-gray-600">
                  Agents get instant notifications with full lead details. Managers get AI-powered insights to optimize performance and close more deals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="w-full py-20 px-4 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your team. All plans include AI-powered parsing and routing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="border border-gray-200 rounded-lg p-8 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Starter</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">$99</span>
                <span className="text-gray-600">/mo</span>
              </div>
              <p className="text-gray-600 mb-6">Perfect for small teams just getting started.</p>
              <ul className="space-y-3 mb-8 flex-1">
                {["Up to 5 agents", "500 leads/month", "AI message parsing", "Email notifications", "Basic analytics"].map(feature => (
                  <li key={feature} className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" onClick={() => setShowContactForm(true)} className="w-full">
                Get Started
              </Button>
            </div>

            {/* Pro - highlighted */}
            <div className="border-2 border-[#6A584C] rounded-lg p-8 flex flex-col relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#6A584C] text-white text-sm font-semibold px-4 py-1 rounded-full">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pro</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">$249</span>
                <span className="text-gray-600">/mo</span>
              </div>
              <p className="text-gray-600 mb-6">For growing teams who need more power.</p>
              <ul className="space-y-3 mb-8 flex-1">
                {["Up to 20 agents", "2,500 leads/month", "AI message parsing", "AI performance insights", "Advanced analytics", "Priority support", "CRM export"].map(feature => (
                  <li key={feature} className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={() => setShowContactForm(true)} className="w-full bg-[#6A584C] hover:bg-[#3A2F28] text-white">
                Get Started
              </Button>
            </div>

            {/* Enterprise */}
            <div className="border border-gray-200 rounded-lg p-8 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">Custom</span>
              </div>
              <p className="text-gray-600 mb-6">For large brokerages with custom needs.</p>
              <ul className="space-y-3 mb-8 flex-1">
                {["Unlimited agents", "Unlimited leads", "AI message parsing", "AI performance insights", "Custom integrations", "Dedicated support", "SLA guarantee"].map(feature => (
                  <li key={feature} className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" onClick={() => setShowContactForm(true)} className="w-full">
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="w-full py-20 px-4 md:px-8 bg-[#1E1E1E] text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Revolutionize Your Lead Management?
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Join real estate teams who've increased their conversion rates with Squire's AI-powered platform.
          </p>
          <Button 
            size="lg" 
            onClick={() => setShowContactForm(true)}
            className="bg-[#C9AD6A] hover:bg-[#A89050] text-black"
          >
            Get Started Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="w-full py-12 px-4 md:px-8 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <img 
                src="/attached_assets/Squire%20Logo.png" 
                alt="Squire Logo" 
                className="h-8 w-auto mr-2"
              />
              <span className="text-xl font-bold text-gray-900">Squire</span>
            </div>
            <p className="text-gray-600">
              Intelligent lead routing for real estate teams.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="#features" className="text-gray-600 hover:text-gray-900">Features</a></li>
              <li><a href="#how-it-works" className="text-gray-600 hover:text-gray-900">How it Works</a></li>
              <li><a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">About</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Blog</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Privacy</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Terms</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Security</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-200 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Squire. All rights reserved.</p>
        </div>
      </footer>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 relative">
            <button 
              onClick={() => { setShowContactForm(false); setFormSubmitted(false); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
            
            {formSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Thanks for reaching out!</h3>
                <p className="text-gray-600">We'll be in touch within 1 business day.</p>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Get Started with Squire</h3>
                <p className="text-gray-600 mb-6">Fill out the form and we'll reach out to get you set up.</p>
                
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="John Smith"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A584C]"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        placeholder="john@example.com"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A584C]"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="(555) 123-4567"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A584C]"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
                    <textarea
                      placeholder="Tell us about your team and what you're looking for..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A584C]"
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-[#6A584C] hover:bg-[#3A2F28] text-white">
                    Send Message
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
