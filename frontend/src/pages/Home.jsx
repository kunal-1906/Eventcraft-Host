import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { 
  Calendar,
  Users,
  MapPin,
  Star,
  ArrowRight,
  CheckCircle,
  Clock,
  Trophy,
  Zap,
  Shield
} from 'lucide-react';

const Home = () => {
   const [events, setEvents] = useState([]);  
  const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

  useEffect(() => {
  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/popular`);

      setEvents(response.data);
    } catch (error) {
      setError("Failed to fetch events.");
    } finally {
      setLoading(false);
    }
  };

  fetchEvents();
}, []);
  
  const user = useSelector((state) => state.user.user);
  
  // Determine dashboard link based on user role
  const getDashboardLink = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'organizer':
        return '/organizer/dashboard';
      case 'attendee':
        return '/attendee/dashboard';
      default:
        return '/';
    }
  };

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };



  const stats = [
    { number: "10K+", label: "Events Created", icon: Calendar },
    { number: "50K+", label: "Happy Attendees", icon: Users },
    { number: "98%", label: "Success Rate", icon: Trophy },
    { number: "24/7", label: "Support", icon: Shield }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Event Organizer",
      company: "TechConf",
      content: "EventCraft transformed how we manage our conferences. The platform is intuitive and our attendees love the seamless experience.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b332c96-4?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Community Manager",
      company: "StartupHub",
      content: "The best event management platform we've used. Simple, powerful, and incredibly reliable for all our meetups.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "Marketing Director", 
      company: "InnovateLab",
      content: "EventCraft helped us scale our events globally. The analytics and insights are game-changing for our marketing strategy.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 pt-16 pb-32">
        <div className="absolute inset-0 bg-hero-pattern opacity-10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary-600/20 to-transparent"></div>
          <div className="absolute top-20 right-10 w-72 h-72 bg-accent-500/20 rounded-full filter blur-3xl animate-float"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary-400/10 rounded-full filter blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              className="text-center lg:text-left"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-6"
              >
                <Zap className="w-4 h-4 mr-2" />
                Trusted by 10,000+ organizers worldwide
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                <span className="block">Transform your</span>
                <span className="block text-gradient bg-gradient-to-r from-accent-300 to-yellow-300 bg-clip-text text-transparent">
                  event experience
                </span>
              </h1>
              
              <p className="text-xl text-white/90 mb-8 max-w-2xl leading-relaxed">
                Create, manage, and attend events seamlessly with EventCraft. From intimate meetups to grand conferences, we've got you covered with cutting-edge technology and intuitive design.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {user ? (
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => window.location.href = getDashboardLink()}
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                    className="text-lg px-8 py-4 shadow-xl hover:shadow-2xl"
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={() => window.location.href = '/register'}
                      rightIcon={<ArrowRight className="w-5 h-5" />}
                      className="text-lg px-8 py-4 shadow-xl hover:shadow-2xl"
                    >
                      Get Started Free
                    </Button>
                    <Button
                      size="lg"
                      variant="ghost"
                      onClick={() => window.location.href = '/login'}
                      className="text-lg px-8 py-4 text-white border-white/30 hover:bg-white/10"
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </div>
              
              <div className="flex items-center justify-center lg:justify-start mt-8 space-x-8 text-white/80">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-300" />
                  <span>Free to start</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-300" />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-300" />
                  <span>Setup in minutes</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            >
              <div className="relative">
                <motion.img 
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                  alt="Event Management Dashboard" 
                  className="rounded-2xl shadow-2xl w-full h-auto object-cover"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-primary-900/20 to-transparent"></div>
                
                {/* Floating elements */}
                <motion.div 
                  className="absolute -top-6 -right-6 bg-white rounded-2xl p-4 shadow-xl"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-secondary-700">1,247 registrations</span>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                >
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-primary-600" />
                    <span className="text-sm font-medium text-secondary-700">Next event: 2 days</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden">
          <svg className="relative block w-full h-20" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="white"></path>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <motion.div 
                key={index}
                variants={fadeInUp}
                className="text-center"
              >
                <Card className="p-6 hover-lift">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg flex items-center justify-center mb-4">
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-primary-900 mb-2">{stat.number}</div>
                    <div className="text-secondary-600 font-medium">{stat.label}</div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-secondary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-secondary-900 mb-4">
              Everything you need for successful events
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              EventCraft provides a comprehensive platform with all the tools and features you need to create, manage, and execute memorable events.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card 
                  className="p-8 text-center hover-lift h-full"
                  variant="elevated"
                >
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-secondary-900 mb-4">{feature.title}</h3>
                  <p className="text-secondary-600 leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-secondary-900 mb-4">
              Loved by event organizers worldwide
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              See what our community of event organizers has to say about their experience with EventCraft.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="p-8 hover-lift h-full">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-secondary-700 mb-6 italic">
                    "{testimonial.content}"
                  </blockquote>
                  <div className="flex items-center">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover mr-4"
                    />
                    <div>
                      <div className="font-semibold text-secondary-900">{testimonial.name}</div>
                      <div className="text-sm text-secondary-600">{testimonial.role}, {testimonial.company}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-10"></div>
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to transform your events?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of event organizers who trust EventCraft to deliver exceptional experiences.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => window.location.href = '/register'}
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                    className="text-lg px-8 py-4"
                  >
                    Start Free Trial
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={() => window.location.href = '/login'}
                    className="text-lg px-8 py-4 text-white border-white/30 hover:bg-white/10"
                  >
                    Watch Demo
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => window.location.href = getDashboardLink()}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  className="text-lg px-8 py-4"
                >
                  Go to Dashboard
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
