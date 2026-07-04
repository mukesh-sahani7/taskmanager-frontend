import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  
  const BASE_URL = 'https://taskmanager-backend-zx31.onrender.com/api'; 
  // Navigation State: 'LOGIN', 'SIGNUP', ya 'DASHBOARD'
  const [page, setPage] = useState('INDEX');

  // User Authentication State
  const [user, setUser] = useState(null); // Login hone ke baad user info save hogi
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  // Task Management State
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  //remainder time
  const [reminderTime, setReminderTime] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notes
  const [notes, setNotes] = useState([]);
  const [noteContent, setNoteContent] = useState('');

  //Edit Notes

  const [editingNoteId, setEditingNoteId] = useState(null);

   //Captcha Code
   const [captchaCode, setCaptchaCode] = useState(''); // Asli captcha code jo screen par dikhega
   const [userCaptchaInput, setUserCaptchaInput] = useState(''); // Jo user type karega
//password view
   const [showLoginPassword, setShowLoginPassword] = useState(false);
   const [showSignupPassword, setShowSignupPassword] = useState(false);
   //navbar dropdown
   const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // =============== AUTH LOGIC (SIGNUP & LOGIN) ===============

//   useEffect(() => {
//       const savedUser = localStorage.getItem("user");
//       if (savedUser) {
//         setUser(JSON.parse(savedUser));
//         setPage('DASHBOARD');
//       }
//     }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    //captcha code validation code

    if (userCaptchaInput !== captchaCode) {
         setAuthError("❌ Invalid Captcha");
         return;
    }

    try {
      await axios.post(`${BASE_URL}/auth/signup`, {
        name: authName,
        email: authEmail,
        password: authPassword
      });
      alert("Registration Successful! Please Login.");
      setPage('LOGIN');
      setAuthPassword('');
      setAuthError('');
    } catch (error) {
      // 🎯 CRASH FIXING LOGIC HERE:
      if (error.response && error.response.data) {
          const serverData = error.response.data;
          
          // Agar server se object aaya hai ({timestamp, status, error...}), toh uski error string nikalo
          if (typeof serverData === 'object') {
              setAuthError(serverData.error || serverData.message || "Signup failed. Try again.");
          } else {
              // Agar backend se direct plain text message aaya hai
              setAuthError(serverData);
          }
      } else {
          setAuthError("Signup failed. Server down or network error.");
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: authEmail,
        password: authPassword
      });
      
      console.log("Login User Data:", response.data);

      // 1. React State update
      setUser(response.data);

      // 2. Session ke liye localStorage me save
      localStorage.setItem("user", JSON.stringify(response.data));
      
      setPage('DASHBOARD');
      setAuthPassword('');
      setAuthError('');
    } catch (error) {
      // 🎯 DYNAMIC ERROR LOGIC (No More Fake Messages)
      if (error.response && error.response.data) {
          const serverData = error.response.data;
          if (typeof serverData === 'object') {
              // Agar controller se direct string text/error map aaya hai
              setAuthError(serverData.error || serverData.message || "Invalid Email or Password!");
          } else {
              setAuthError(serverData);
          }
      } else {
          setAuthError("Network Error: Server is down!");
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setPage('INDEX');
    setTasks([]);
  };

  //profile picture

 const handleProfilePicUpload = async (e) => {
     const file = e.target.files[0];
     if (!file || !user) return;

     // Check size (Optional: max 2MB file size control)
     if (file.size > 2 * 1024 * 1024) {
       alert("File size must be under 2MB");
       return;
     }

     const reader = new FileReader();
     reader.readAsDataURL(file);
     reader.onloadend = async () => {
       const base64String = reader.result;

       console.log("Image successfully converted to Base64!"); // Debugging

       try {
         const response = await axios.put(`${BASE_URL}/auth/update-profile-pic/${user.userId}`, {
           profilePic: base64String
         });

         console.log("Response from server:", response.data); // 👈 Check karein data kya aaya

         // Local storage aur state dono update karein
         const updatedUser = { ...user, profilePic: base64String };
         setUser(updatedUser);

         // Agar aap user data local storage me save karte hain toh yahan bhi update karein:
         // localStorage.setItem("user", JSON.stringify(updatedUser));

         alert("Profile picture updated successfully! 🎉");
       } catch (error) {
         console.error("Upload error detail:", error.response?.data || error.message);
         alert("Server error: Photo save nahi ho payi.");
       }
     };
   };

 const fetchTasks = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${BASE_URL}/tasks?userId=${user.userId}`);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  // Jab user dashboard par aaye, tabhi tasks fetch hon
  useEffect(() => {
    if (page === 'DASHBOARD') {
      fetchTasks();
      fetchNotes();
    }
  }, [page]);



const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title || !user || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await axios.post(`${BASE_URL}/tasks?userId=${user.userId}`, {
        title,
        description,
        status: 'PENDING',
        priority,
        reminderTime: reminderTime ? reminderTime : null
      });

      setTitle('');
      setDescription('');
      setReminderTime('');

      await fetchTasks();
     } catch (error) {
      console.error("Error adding task:", error);
    } finally {
      setIsSubmitting(false);
    } // try-catch-finally ka bracket band hua
  };



  const toggleStatus = async (task) => {
    const newStatus = task.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
    try {
      await axios.put(`${BASE_URL}/tasks/${task.id}`, {
        ...task,
        status: newStatus
      });
      fetchTasks();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/tasks/${id}`);
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  //Notes Add Delete Fetch

  const fetchNotes = async () => {
      if (!user) return;
      try {
        const response = await axios.get(`${BASE_URL}/notes?userId=${user.userId}`);
        setNotes(response.data);
      } catch (error) {
        console.error("Error fetching notes:", error);
      }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();

      // Check karein ki user logged in hai aur input khali nahi hai
        if (!noteContent || !user) {
          console.error("User or Note Content is missing!");
          return;
        }

        try {
          // URL me ?userId=... bhej rahe hain aur body me { content: noteContent }
          await axios.post(`${BASE_URL}/notes?userId=${user.userId}`, {
            content: noteContent //  Yeh backend ke 'content' field se match hona chahiye
          });

          setNoteContent(''); // Form clear
          await fetchNotes(); // List refresh
        } catch (error) {
          console.error("Error adding note:", error.response?.data || error.message);
        }
      };

    const deleteNote = async (id) => {
      try {
        await axios.delete(`${BASE_URL}/notes/${id}`);
        fetchNotes();
      } catch (error) {
        console.error("Error deleting note:", error);
      }
    };

    const handleUpdateNote = async (e) => {
        e.preventDefault();
        if (!noteContent || !editingNoteId) return;

        try {
          await axios.put(`${BASE_URL}/notes/${editingNoteId}`, {
            content: noteContent
          });

          setNoteContent('');
          setEditingNoteId(null); // Edit mode off karein
          fetchNotes(); // List refresh karein
        } catch (error) {
          console.error("Error updating note:", error);
        }
      };

  // Naya random captcha generate karne ke liye
    const generateCaptcha = () => {
      const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let result = "";
      for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setCaptchaCode(result);
      setUserCaptchaInput(''); // Purana input saaf karein
    };

    // Jab bhi user signup page par aaye, captcha automatic generate ho
    useEffect(() => {
      if (page === 'SIGNUP') {
        generateCaptcha();
      }
    }, [page]);

    // 1. Note ko computer/mobile me .txt file banakar download karne ke liye
      const exportNoteAsTXT = (note) => {
        const element = document.createElement("a");
        const file = new Blob([note.content], { type: 'text/plain;charset=utf-8' });
        element.href = URL.createObjectURL(file);
        element.download = `Note-${new Date(note.createdAt).toLocaleDateString()}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      };

      // 2. Note ko Clipboard par copy karne ya direct share karne ke liye
      const shareNote = async (note) => {
        // mobile browser hai aur Web Share API support karta hai (WhatsApp/System share ke liye)
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'My Saved Note',
              text: note.content,
            });
          } catch (error) {
            console.log('Sharing canceled or failed:', error);
          }
        } else {
          // Agar Desktop browser hai toh clipboard par copy kar dega
          navigator.clipboard.writeText(note.content);
          alert("Note content copied to clipboard! ");
        }
      };




  // =============== RENDER PAGES ===============

 // INDEX PAGE

 // 0. PREMIUM LANDING / INDEX PAGE
   if (page === 'INDEX') {
     return (
       <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white font-sans antialiased flex flex-col justify-between">

         {/* Header / Navbar */}
         <header className="px-6 py-5 max-w-6xl w-full mx-auto flex justify-between items-center border-b border-white/10">
           <div className="flex items-center gap-2">
             <div className="h-9 w-9 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/20">
               T
             </div>
             <span className="font-extrabold tracking-tight text-xl bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
               TaskWorkspace
             </span>
           </div>
           <div className="flex items-center gap-4">
             <button
               onClick={() => setPage('LOGIN')}
               className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
             >
               Sign In
             </button>
             <button
               onClick={() => setPage('SIGNUP')}
               className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
             >
               Get Started
             </button>
           </div>
         </header>

         {/* Hero Section */}
         <main className="max-w-4xl mx-auto px-4 text-center py-20 flex flex-col items-center justify-center flex-grow">
           <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-xs font-semibold text-blue-300 mb-6 backdrop-blur-md">
             🚀 Introducing Multi-User Dashboards
           </div>

           <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight max-w-3xl bg-gradient-to-b from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-6">
             Organize Your Daily Tasks In a New Way..
           </h1>

           <p className="text-slate-400 text-base md:text-xl max-w-2xl leading-relaxed mb-10">
             An ultra-fast task manager built with Spring Boot and React. Track tasks on your personal dashboard, set priorities, and boost your productivity.
           </p>

           {/* Action Buttons */}
           <div className="flex flex-col sm:flex-row gap-4 w-full justify-center px-4">
             <button
               onClick={() => setPage('SIGNUP')}
               className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-base shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-150"
             >
               Create Free Account
             </button>
             <button
               onClick={() => setPage('LOGIN')}
               className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-all duration-150 backdrop-blur-md"
             >
               Log In to Workspace
             </button>
           </div>

           {/* Features Grid */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full mt-24 border-t border-white/5 pt-12">
             <div className="text-left bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl">
               <div className="text-2xl mb-2">⚡</div>
               <h3 className="font-bold text-sm text-slate-200 mb-1">Ultra Fast</h3>
               <p className="text-xs text-slate-400 leading-relaxed">Instant updates without page reloads</p>
             </div>
             <div className="text-left bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl">
               <div className="text-2xl mb-2">🔒</div>
               <h3 className="font-bold text-sm text-slate-200 mb-1">Secure Auth</h3>
               <p className="text-xs text-slate-400 leading-relaxed">Your password is always safe with Spring Security and BCrypt hashing.</p>
             </div>
             <div className="text-left bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl">
               <div className="text-2xl mb-2">👥</div>
               <h3 className="font-bold text-sm text-slate-200 mb-1">Multi-User</h3>
               <p className="text-xs text-slate-400 leading-relaxed">Each user's data is completely isolated. Your task will be visible only to you..</p>
             </div>
           </div>
         </main>

         {/* Footer */}
         <footer className="text-center py-6 text-xs text-slate-500 border-t border-white/5">
           © 2026 TaskWorkspace. Built with Spring Boot & React. All rights reserved. Developer Mukesh Sahani
         </footer>

       </div>
     );
   }

  // 1. LOGIN PAGE
  // 1. MODERN LOGIN PAGE
    if (page === 'LOGIN') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 md:p-0">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row min-h-[550px]">

            {/* Left Side: Brand/Welcome Panel */}
            <div className="md:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 md:p-12 flex flex-col justify-between text-white">
              <div>

                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                  Manage Tasks, <br />Easily & Securely.
                </h2>
                <p className="text-blue-100 text-sm md:text-base leading-relaxed mb-6">
                  An advanced platform that helps track your daily routine and projects.
                </p>
              </div>

              {/* Feature Badges */}
              <div className="space-y-3 hidden md:block">

                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <span className="text-lg">👥</span>
                  <p className="text-sm font-medium">Multi-User Isolated Dashboards</p>
                </div>
              </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-800">Welcome Back!</h3>
                <p className="text-gray-500 text-sm mt-1">Enter your details to log in to your account.</p>
              </div>

              {authError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded mb-4 text-red-700 text-xs font-medium">
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
               <div className="relative">
                               <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Password</label>
                               <div className="relative">
                                 <input
                                   type={showLoginPassword ? "text" : "password"} // 👈 Toggle type dynamically
                                   placeholder="••••••••"
                                   value={authPassword}
                                   onChange={(e) => setAuthPassword(e.target.value)}
                                   maxLength="8"
                                   className="w-full border border-gray-200 p-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                   required
                                 />
                                 {/* 👁 Show/Hide Button */}
                                 <button
                                   type="button"
                                   onClick={() => setShowLoginPassword(!showLoginPassword)}
                                   className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400 hover:text-blue-600 transition-colors"
                                 >
                                   {showLoginPassword ? "👁" : "Show"}
                                 </button>
                               </div>
                             </div>

                <button type="submit" className="w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-3 rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 hover:shadow-none transition-all duration-200 mt-2">
                  Sign In
                </button>
              </form>

              <div className="mt-8 text-center border-t pt-6">
                <p className="text-sm text-gray-600">
                  Create a new account ?{' '}
                  <button onClick={() => { setPage('SIGNUP'); setAuthError(''); }} className="text-black-600 font-bold hover:underline">
                    Sign Up Here
                  </button>&nbsp;&nbsp;
                   <button onClick={() => { setPage('INDEX'); setAuthError(''); }} className="text-black-600 font-bold hover:underline">
                     Home
                   </button>
                   </p>

              </div>
            </div>

          </div>
        </div>
      );
    }
  // 2. SIGNUP PAGE

    if (page === 'SIGNUP') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4 md:p-0">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row min-h-[550px]">

            {/* Left Side: Brand Panel */}
            <div className="md:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 md:p-12 flex flex-col justify-between text-white">
              <div>

                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                  Get Started <br />In Few Seconds.
                </h2>
                <p className="text-green-100 text-sm md:text-base leading-relaxed mb-6">
                  Create your personal workspace and track your tasks without any distractions.
                </p>
              </div>

              <div className="space-y-3 hidden md:block">

                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <span className="text-lg">🎯</span>
                  <p className="text-sm font-medium">Priority Labels (High, Medium, Low)</p>
                </div>
              </div>
            </div>

            {/* Right Side: Signup Form */}
            <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Create Account</h3>

              </div>

              {authError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded mb-4 text-red-700 text-xs font-medium">
                  {authError}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
               <div className="relative">
                               <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Password</label>
                               <div className="relative">
                                 <input
                                   type={showSignupPassword ? "text" : "password"} // 👈 Toggle type dynamically
                                   placeholder="Create strong password"
                                   value={authPassword}
                                   onChange={(e) => setAuthPassword(e.target.value)}
                                   maxLength="8"
                                   className="w-full border border-gray-200 p-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                   required
                                 />
                                 {/* 👁 Show/Hide Button */}
                                 <button
                                   type="button"
                                   onClick={() => setShowSignupPassword(!showSignupPassword)}
                                   className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400 hover:text-green-600 transition-colors"
                                 >
                                   {showSignupPassword ? "👁" : "Show"}
                                 </button>
                               </div>
                             </div>
                {/* 🔒 CAPTCHA SECTION */}
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">CAPTCHA</label>

                                <div className="flex items-center gap-4">
                                  {/* Captcha Display Box (Stylish Styled Text) */}
                                  <div className="  text-emerald-400 font-mono tracking-widest text-lg font-black px-4 py-2  text-center min-w-[100px] line-through decoration-slate-500/50 skew-x-12 ">
                                    {captchaCode}
                                  </div>

                                  {/* Refresh Button */}
                                  <button
                                    type="button"
                                    onClick={generateCaptcha}

                                    title="Change Captcha"
                                  >
                                    🔄
                                  </button>
                                  <input
                                     type="text"
                                       value={userCaptchaInput}
                                        onChange={(e) => setUserCaptchaInput(e.target.value)}
                                        className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white font-mono"
                                        required
                                      />
                                </div>

                                {/* Input for user */}

                              </div>
                <button type="submit" className="w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-3 rounded-xl hover:bg-green-700 font-bold shadow-lg shadow-green-200 hover:shadow-none transition-all duration-200 mt-2">
                  Create Account
                </button>
              </form>

              <div className="mt-6 text-center border-t pt-4">
                <p className="text-sm text-gray-600">
                  already have an account?{' '}
                  <button onClick={() => { setPage('LOGIN'); setAuthError(''); }} className="text-black-600 font-bold hover:underline">
                    Sign In Instead
                  </button> &nbsp;&nbsp;
                  <button onClick={() => { setPage('INDEX'); setAuthError(''); }} className="text-black-600 font-bold hover:underline">
                                       Home
                                    </button>
                </p>
              </div>
            </div>

          </div>
        </div>
      );
    }
  // 3. DASHBOARD PAGE (Login ke baad dikhega)

 // 3. MODERN PREMIUM DASHBOARD PAGE (Login ke baad dikhega)
   return (
     <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiasing">

       {/* Top Navbar */}

          {/* Top Navbar with Profile Dropdown */}
                <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
                  <div className="max-w-5xl mx-auto flex justify-between items-center">

                    {/* Left Side: Brand Logo & Title */}
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-200">
                        T
                      </div>
                      <div>
                        <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-slate-950 to-slate-700 bg-clip-text text-transparent">
                          TaskWorkspace
                        </h1>
                        <p className="text-xs font-medium text-slate-400">Welcome back! ✨</p>
                      </div>
                    </div>

                    {/* Right Side: Interactive Dropdown Container */}
                    <div className="relative">

                      {/* Trigger Button: User Avatar */}
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-50 transition-all focus:outline-none"
                      >
                        <div className="h-10 w-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner flex items-center justify-center relative">
                          {user?.profilePic ? (
                            <img src={user.profilePic} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-base font-bold text-slate-500">{user?.name?.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 hidden sm:block">{user?.name || 'User'}</span>
                        <span className="text-xs text-slate-400 transition-transform duration-200 hidden sm:block" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          ▼
                        </span>
                      </button>

                      {/* Floating Dropdown Menu Card */}
                      {isDropdownOpen && (
                        <>
                          {/* Background Overlay to close dropdown when clicking outside */}
                          <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>

                          {/* Dropdown Options List */}
                          <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-150">

                            {/* User Profile Summary Header */}
                            <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Signed in as</p>
                              <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{user?.email}</p>
                            </div>

                            {/* Links / Options Group */}
                            <div className="p-1.5 space-y-0.5">

                              {/* Option 1: Profile Photo Upload Link */}
                              <label className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer">
                                <span>👤</span> Change Avatar
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    handleProfilePicUpload(e);
                                    setIsDropdownOpen(false); // Action ke baad menu close
                                  }}
                                  className="hidden"
                                />
                              </label>

                              {/* Option 2: Account Settings (Placeholder) */}
                              <button
                                onClick={() => { alert("Settings Panel Coming Soon! 🛠️"); setIsDropdownOpen(false); }}
                                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left"
                              >
                                <span>⚙️</span> Account Settings
                              </button>




                              <hr className="border-slate-100 my-1" />

                              {/* Option 4: Danger Zone - Logout */}
                              <button
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  handleLogout();
                                }}
                                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                              >
                                <span>🚪</span> Sign Out / Logout
                              </button>

                            </div>
                          </div>
                        </>
                      )}

                    </div>

                  </div>
                </nav>

       {/* Main Dashboard Area */}
       <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

         {/* Left Column: Create New Task Form */}



         <div className="lg:col-span-2 space-y-4">

           {/* Stats Bar */}
           <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm flex justify-between items-center">
             <div>
               <h3 className="text-sm font-medium text-indigo-200">Workspace Status</h3>
               <p className="text-2xl font-black mt-0.5">{tasks.length} Total Tasks</p>
             </div>
             <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm text-xs font-semibold text-indigo-100">
               Completed: {tasks.filter(t => t.status === 'COMPLETED').length}
             </div>
           </div>

           {/* Actual List Card */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
               <span className="text-xs font-bold uppercase tracking-wider text-slate-400">All Live Tasks</span>
               <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>


             </div>



             {tasks.length === 0 ? (
               <div className="p-12 text-center">
                 <div className="text-4xl mb-3">🎯</div>
                 <p className="text-slate-500 font-medium text-sm">No Pending Tasks!</p>
                 <p className="text-xs text-slate-400 mt-1">Add your first task using the form above.</p>
               </div>
             ) : (
               <ul className="divide-y divide-slate-100">
                 {tasks.map((task) => (
                   <li
                     key={task.id}
                     className={`p-5 flex items-start justify-between gap-4 transition-all duration-150 hover:bg-slate-50/60 ${
                       task.status === 'COMPLETED' ? 'bg-slate-50/30' : ''
                     }`}
                   >
                     <div className="flex items-start gap-4 data-container">
                       {/* Modern Custom Checkbox */}
                       <div className="relative flex items-center mt-1">
                         <input
                           type="checkbox"
                           checked={task.status === 'COMPLETED'}
                           onChange={() => toggleStatus(task)}
                           className="h-5 w-5 border-slate-300 text-blue-600 rounded-lg focus:ring-blue-500 cursor-pointer accent-blue-600"
                         />
                       </div>

                       <div>
                         <h3 className={`font-bold text-base transition-all ${
                           task.status === 'COMPLETED' ? 'line-through text-slate-400 font-medium' : 'text-slate-800'
                         }`}>
                           {task.title}
                         </h3>
                         {task.description && (
                           <p className={`text-sm mt-0.5 ${task.status === 'COMPLETED' ? 'text-slate-300' : 'text-slate-500'}`}>
                             {task.description}
                           </p>
                         )}

                         {/* Dynamic Priority Badge */}
                         <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-2 border ${
                           task.priority === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                           task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                           'bg-emerald-50 text-emerald-700 border-emerald-100'
                         }`}>
                           <span className={`h-1.5 w-1.5 rounded-full ${
                             task.priority === 'HIGH' ? 'bg-rose-500' :
                             task.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                           }`}></span>
                           {task.priority} Priority
                         </span>

                       </div>

                     </div>

                     {/* Delete Button */}
                     <button
                       onClick={() => deleteTask(task.id)}
                       className="text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-100 p-2 rounded-xl hover:bg-rose-50/50 transition-all duration-150 self-center"
                       title="Delete Task"
                     >
                       🗑️
                     </button>

                   </li>
                 ))}
               </ul>
             )}
           </div>
         </div>

            {/* Right Column: Interactive Tasks List */}
         <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
                      <h2 className="text-xl font-bold text-slate-900 mb-1">Create Task</h2>
                      <p className="text-xs text-slate-400 mb-5">Enter the details of your new task here.</p>

                      <form onSubmit={handleAddTask} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Task Title *</label>
                          <input
                            type="text"
                            placeholder="e.g., Complete Report"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Priority Level</label>
                          <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50 font-medium"
                          >
                            <option value="HIGH">🔴 High Priority</option>
                            <option value="MEDIUM">🟡 Medium Priority</option>
                            <option value="LOW">🟢 Low Priority</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Set Reminder Date & Time</label>
                          <input
                            type="datetime-local" // calendar aur time dono select hoga
                            value={reminderTime}
                            onChange={(e) => setReminderTime(e.target.value)}
                            className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description (Optional)</label>
                          <textarea
                            placeholder="Write Some Extra Notes..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="3"
                            className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50 resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting} // 👈 Jab tak process chal raha hai, button disable rahega
                          className={`w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl font-bold text-sm shadow-md transition-all duration-150 active:scale-[0.98] mt-2 ${
                            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isSubmitting ? 'Adding...' : '+ Add to My List'}
                        </button>
                      </form>
                    </div>
                  </div>

         {/* ================= QUICK NOTES SECTION ================= */}
                 <div className="lg:col-span-3 mt-4">
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                     <h2 className="text-xl font-bold text-slate-900 mb-1">📝 Quick Notes Workspace</h2>
                     <p className="text-xs text-slate-400 mb-5">Save Your Idea, Thought, Links(Isolated per user).</p>

                     {/* Note Input Form */}
                     <form onSubmit={(e) => {
                                           e.preventDefault();
                                           if (editingNoteId) {
                                             handleUpdateNote(e); // Agar edit mode active hai toh update chalega
                                           } else {
                                             handleAddNote(e);    // Nahi toh naya note banega
                                           }
                                         }}
                                         className="mb-6 flex gap-3">
                       <textarea
                         type="text"
                         placeholder="Write Your Notes Here..."
                         value={noteContent}
                         onChange={(e) => setNoteContent(e.target.value)}
                         className="flex-grow border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all bg-slate-50/50"
                         required
                       />
                       <button
                                       type="submit"
                                       className={`font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-md ${
                                         editingNoteId
                                           ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                                           : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100'
                                       }`}
                                     >
                                       {editingNoteId ? 'Update Note' : 'Save Note'}
                                     </button>
                                     {editingNoteId && (
                                       <button
                                         type="button"
                                         onClick={() => { setEditingNoteId(null); setNoteContent(''); }}
                                         className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-3 rounded-xl text-sm transition-all"
                                       >
                                         Cancel
                                       </button>
                                     )}
                     </form>

                     {/* Sticky Notes Grid Layout */}
                     {notes.length === 0 ? (
                       <p className="text-center text-slate-400 text-xs py-4">Save Your First Note..</p>
                     ) : (
                       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                         {notes.map((note) => (
                           <div key={note.id} className="bg-amber-50/60 border border-amber-100 p-4 rounded-xl relative group flex flex-col justify-between min-h-[100px] transition-all hover:shadow-sm">
                             <p className="text-slate-700 text-sm break-words whitespace-pre-line pr-6">
                               {note.content}
                             </p>
                             <div className="flex justify-between items-center mt-4 border-t border-amber-200/50 pt-2">
                               <span className="text-[10px] text-amber-600 font-medium">
                                 {new Date(note.createdAt).toLocaleDateString()}
                               </span>
                                 <div className="flex justify-between items-center mt-4 border-t border-amber-200/50 pt-2">
                                   <span className="text-[10px] text-amber-600 font-medium">

                                    </span>

                                      {/* Interactive Buttons Container */}

                                                       <div className="flex gap-2">
                                                         {/* 📥 EXPORT BUTTON */}
                                                         <button
                                                           onClick={() => exportNoteAsTXT(note)}
                                                           className="text-amber-500 hover:text-emerald-600 text-xs transition-colors"
                                                           title="Download as TXT File"
                                                         >
                                                           📥
                                                         </button>

                                                         {/* 🔗 SHARE / COPY BUTTON */}
                                                         <button
                                                           onClick={() => shareNote(note)}
                                                           className="text-amber-500 hover:text-blue-600 text-xs transition-colors"
                                                           title="Share or Copy Note"
                                                         >
                                                           🔗
                                                         </button>

                                                         {/* ✏️ EDIT BUTTON */}
                                                         <button
                                                           onClick={() => {
                                                             setEditingNoteId(note.id);
                                                             setNoteContent(note.content);
                                                           }}
                                                           className="text-amber-500 hover:text-indigo-600 text-xs transition-colors"
                                                           title="Edit Note"
                                                         >
                                                           ✏️
                                                         </button>

                                                         {/* 🗑️ DELETE BUTTON */}
                                                         <button
                                                           onClick={() => deleteNote(note.id)}
                                                           className="text-amber-400 hover:text-red-500 text-xs transition-colors"
                                                           title="Delete Note"
                                                         >
                                                           🗑️
                                                         </button>
                                   </div>
                                </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 </div>

       </main>
     </div>
   );

}
export default App;
