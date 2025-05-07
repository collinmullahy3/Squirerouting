import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  CheckCircle2, 
  BarChart3, 
  GitPullRequest, 
  Users 
} from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navigation */}
      <header className="w-full py-4 px-4 md:px-8 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <img 
              src="/attached_assets/Squire%20Logo.png" 
              alt="Squire Logo" 
              className="h-10 w-auto mr-2"
            />
            <span className="text-2xl font-bold text-gray-900">Squire</span>
          </div>
          <div className="hidden md:flex space-x-6">
            <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</a>
            <a href="#testimonials" className="text-gray-600 hover:text-gray-900">Testimonials</a>
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
              onClick={() => setLocation("/login")}
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
              Squire helps real estate teams convert more leads with intelligent routing, 
              automated follow-up, and performance tracking.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
              <Button 
                size="lg" 
                onClick={() => setLocation("/login")}
                className="bg-[#6A584C] hover:bg-[#3A2F28] text-white"
              >
                Start Free Trial
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
            <div className="flex items-center space-x-2 pt-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-gray-600">No credit card required</span>
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
            {/* Feature 1 */}
            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
              <div className="bg-[#6A584C]/10 p-3 rounded-lg inline-block mb-4">
                <GitPullRequest className="h-8 w-8 text-[#6A584C]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Intelligent Lead Routing
              </h3>
              <p className="text-gray-600">
                Automatically route leads to the right agent based on location, price point, and availability.
              </p>
            </div>
            
            {/* Feature 2 */}
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
            
            {/* Feature 3 */}
            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
              <div className="bg-[#6A584C]/10 p-3 rounded-lg inline-block mb-4">
                <BarChart3 className="h-8 w-8 text-[#6A584C]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Performance Analytics
              </h3>
              <p className="text-gray-600">
                Track conversion rates, response times, and agent performance to optimize your sales pipeline.
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
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-lg border border-gray-200 relative z-10">
                <div className="absolute -top-5 -left-5 bg-[#C9AD6A] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl">
                  1
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 mt-4">
                  Capture Leads
                </h3>
                <p className="text-gray-600">
                  Automatically collect leads from emails, forms, and third-party platforms into one unified system.
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 z-0">
                <ArrowRight className="h-8 w-8 text-gray-300" />
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-lg border border-gray-200 relative z-10">
                <div className="absolute -top-5 -left-5 bg-[#C9AD6A] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl">
                  2
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 mt-4">
                  Route Intelligently
                </h3>
                <p className="text-gray-600">
                  Use custom rules to assign leads to the right agents based on expertise, availability, and performance.
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 z-0">
                <ArrowRight className="h-8 w-8 text-gray-300" />
              </div>
            </div>
            
            {/* Step 3 */}
            <div>
              <div className="bg-white p-8 rounded-lg border border-gray-200">
                <div className="absolute -top-5 -left-5 bg-[#C9AD6A] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl">
                  3
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 mt-4">
                  Convert More Clients
                </h3>
                <p className="text-gray-600">
                  Monitor performance, optimize your process, and turn more leads into happy clients.
                </p>
              </div>
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
            Join hundreds of real estate teams who've increased their conversion rates by up to 40%.
          </p>
          <Button 
            size="lg" 
            onClick={() => setLocation("/login")}
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
              <li><a href="#testimonials" className="text-gray-600 hover:text-gray-900">Testimonials</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">About</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Blog</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Careers</a></li>
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
    </div>
  );
}