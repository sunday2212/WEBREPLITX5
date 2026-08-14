/* empty css               */(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))t(e);new MutationObserver(e=>{for(const c of e)if(c.type==="childList")for(const n of c.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&t(n)}).observe(document,{childList:!0,subtree:!0});function a(e){const c={};return e.integrity&&(c.integrity=e.integrity),e.referrerPolicy&&(c.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?c.credentials="include":e.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function t(e){if(e.ep)return;e.ep=!0;const c=a(e);fetch(e.href,c)}})();class m{constructor(){this.platforms=[{name:"Marrow",description:"Comprehensive NEET PG preparation with expert faculty",icon:"fas fa-graduation-cap"},{name:"DAMS",description:"Delhi Academy of Medical Sciences - Premier coaching",icon:"fas fa-user-md"},{name:"PrepLadder",description:"Interactive video lectures and practice tests",icon:"fas fa-laptop-medical"}]}render(){const s=document.createElement("div");return s.className="platform-selector",this.platforms.forEach(a=>{const t=document.createElement("button");t.innerHTML=`
        <i class="${a.icon}"></i>
        <div class="platform-name">${a.name}</div>
        <div class="platform-description">${a.description}</div>
      `,t.onclick=()=>this.handlePlatformSelect(a.name.toLowerCase()),s.appendChild(t)}),s}handlePlatformSelect(s){const a=new CustomEvent("platformSelect",{detail:s});document.dispatchEvent(a)}}class f{constructor(){this.subjects=[{name:"Anatomy",icon:"fas fa-skeleton",teacher:"Dr. Rajesh Kaushal"},{name:"Physiology",icon:"fas fa-heartbeat",teacher:"Dr. Vinay Jain"},{name:"Biochemistry",icon:"fas fa-flask",teacher:"Dr. Rebecca James"},{name:"Pathology",icon:"fas fa-microscope",teacher:"Dr. Sumer Sethi"},{name:"Microbiology",icon:"fas fa-bacteria",teacher:"Dr. Apurba S. Sastry"},{name:"Pharmacology",icon:"fas fa-pills",teacher:"Dr. Gobind Rai Garg"},{name:"Forensic Medicine",icon:"fas fa-search",teacher:"Dr. Anil Aggrawal"},{name:"ENT",icon:"fas fa-ear",teacher:"Dr. P.L. Dhingra"},{name:"Ophthalmology",icon:"fas fa-eye",teacher:"Dr. A.K. Khurana"},{name:"Community Medicine",icon:"fas fa-users",teacher:"Dr. Vivek Jain"},{name:"Medicine",icon:"fas fa-stethoscope",teacher:"Dr. Amit Ashish"},{name:"Surgery",icon:"fas fa-procedures",teacher:"Dr. Rohan Khandelwal"},{name:"Obstetrics",icon:"fas fa-baby",teacher:"Dr. Sakshi Arora"},{name:"Gynecology",icon:"fas fa-female",teacher:"Dr. Richa Saxena"},{name:"Pediatrics",icon:"fas fa-child",teacher:"Dr. Meenakshi Bothra"},{name:"Orthopedics",icon:"fas fa-bone",teacher:"Dr. Tushar Mehta"},{name:"Radiology",icon:"fas fa-x-ray",teacher:"Dr. Chandra Mohan"},{name:"Anesthesia",icon:"fas fa-syringe",teacher:"Dr. Amit Kumar"},{name:"Psychiatry",icon:"fas fa-brain",teacher:"Dr. Neeraj Bhalla"},{name:"Emergency Medicine",icon:"fas fa-ambulance",teacher:"Dr. Pradeep Sharma"}]}render(s){const a=document.createElement("div");return a.className="subject-list",this.subjects.forEach(t=>{const e=document.createElement("div");e.className="subject-card",e.innerHTML=`
        <i class="${t.icon}"></i>
        <span class="subject-name">${t.name}</span>
        <span class="teacher-name">${t.teacher}</span>
      `,e.onclick=()=>this.handleSubjectSelect(s,t.name),a.appendChild(e)}),a}handleSubjectSelect(s,a){const t=new CustomEvent("subjectSelect",{detail:{platform:s,subject:a}});document.dispatchEvent(t)}}class p{constructor(){this.subjects=[{name:"Anatomy",icon:"fas fa-skeleton",teacher:"Dr. Ashwani Kumar"},{name:"Physiology",icon:"fas fa-heartbeat",teacher:"Dr. Yogesh Patel"},{name:"Biochemistry",icon:"fas fa-flask",teacher:"Dr. Vasudev Sharma"},{name:"Pathology",icon:"fas fa-microscope",teacher:"Dr. Harsh Mohan"},{name:"Microbiology",icon:"fas fa-bacteria",teacher:"Dr. Ananthnarayan"},{name:"Pharmacology",icon:"fas fa-pills",teacher:"Dr. K.D. Tripathi"},{name:"ENT",icon:"fas fa-ear",teacher:"Dr. Mohan Bansal"},{name:"Ophthalmology",icon:"fas fa-eye",teacher:"Dr. Ruchi Rai"},{name:"Medicine",icon:"fas fa-stethoscope",teacher:"Dr. Praveen Gupta"},{name:"Surgery",icon:"fas fa-procedures",teacher:"Dr. Sriram Bhat"},{name:"OBG",icon:"fas fa-baby",teacher:"Dr. Daftary Shirish"},{name:"Pediatrics",icon:"fas fa-child",teacher:"Dr. Vinod Paul"},{name:"Orthopedics",icon:"fas fa-bone",teacher:"Dr. John Ebnezar"},{name:"Radiology",icon:"fas fa-x-ray",teacher:"Dr. Satish K Bhargava"},{name:"Psychiatry",icon:"fas fa-brain",teacher:"Dr. Niraj Ahuja"},{name:"Clinical Cases",icon:"fas fa-user-md",teacher:"Dr. Yash Pal Munjal"}]}render(s){const a=document.createElement("div");return a.className="subject-list",this.subjects.forEach(t=>{const e=document.createElement("div");e.className="subject-card",e.innerHTML=`
        <i class="${t.icon}"></i>
        <span class="subject-name">${t.name}</span>
        <span class="teacher-name">${t.teacher}</span>
      `,e.onclick=()=>this.handleSubjectSelect(s,t.name),a.appendChild(e)}),a}handleSubjectSelect(s,a){const t=new CustomEvent("subjectSelect",{detail:{platform:s,subject:a}});document.dispatchEvent(t)}}class b{constructor(){this.subjects=[{name:"Anatomy",icon:"fas fa-skeleton"},{name:"Physiology",icon:"fas fa-heartbeat"},{name:"Biochemistry",icon:"fas fa-flask"},{name:"Pathology",icon:"fas fa-microscope"},{name:"Microbiology",icon:"fas fa-bacteria"},{name:"Pharmacology",icon:"fas fa-pills"},{name:"Forensic Medicine",icon:"fas fa-search"},{name:"ENT",icon:"fas fa-ear"},{name:"Ophthalmology",icon:"fas fa-eye"},{name:"PSM",icon:"fas fa-users"},{name:"General Medicine",icon:"fas fa-stethoscope"},{name:"General Surgery",icon:"fas fa-procedures"},{name:"OBG",icon:"fas fa-baby"},{name:"Pediatrics",icon:"fas fa-child"},{name:"Orthopedics",icon:"fas fa-bone"},{name:"Radio-diagnosis",icon:"fas fa-x-ray"},{name:"Anesthesia",icon:"fas fa-syringe"},{name:"Psychiatry",icon:"fas fa-brain"},{name:"Rapid Review",icon:"fas fa-fast-forward"}]}render(s){const a=document.createElement("div");return a.className="subject-list",this.subjects.forEach(t=>{const e=document.createElement("div");e.className="subject-card",e.innerHTML=`
        <i class="${t.icon}"></i>
        <span>${t.name}</span>
      `,e.onclick=()=>this.handleSubjectSelect(s,t.name),a.appendChild(e)}),a}handleSubjectSelect(s,a){const t=new CustomEvent("subjectSelect",{detail:{platform:s,subject:a}});document.dispatchEvent(t)}}class y{constructor(){this.currentView="search"}async getAllLectures(){const s=[];try{const a=await fetch("platforms/manifest.json");if(!a.ok)return console.error("Could not load manifest.json"),s;const t=await a.json();for(const e of t){const{platform:c,subfolder:n,files:o}=e,l=n==="non"?c:`${c}/${n}`;for(const d of o)try{const i=await fetch(`platforms/${l}/${d}`);if(i.ok){const h=await i.json();h.lectures&&Array.isArray(h.lectures)&&h.lectures.forEach(u=>{s.push({...u,subject:h.subjectName||d.replace(".json",""),platform:c.charAt(0).toUpperCase()+c.slice(1),subfolder:n})})}}catch(i){console.log(`Could not load ${l}/${d}:`,i)}}}catch(a){console.error("Error loading manifest or lecture data:",a)}return s}render(){const s=document.createElement("div");s.className="search-page";const a=document.createElement("div");a.className="search-container";const t=document.createElement("div");t.className="enhanced-search-bar";const e=document.createElement("input");e.type="text",e.placeholder="Search...",e.className="search-input";const c=document.createElement("div");return c.className="search-results",e.addEventListener("input",async n=>{const o=n.target.value.toLowerCase();if(o.length<2){c.innerHTML='<p class="search-prompt">Enter at least 2 characters to search</p>';return}const d=(await this.getAllLectures()).filter(i=>i.title.toLowerCase().includes(o)||i.subject.toLowerCase().includes(o));this.displayLectureResults(d,c)}),t.appendChild(e),a.appendChild(t),s.appendChild(a),s.appendChild(c),s}displayLectureResults(s,a){if(s.length===0){a.innerHTML='<p class="no-results">No lectures found</p>';return}a.innerHTML=s.map(t=>`
      <div class="search-result-card" onclick="document.dispatchEvent(new CustomEvent('subjectSelect', { detail: { platform: '${t.platform.toLowerCase()}', subject: '${t.subject}' } }))">
        <div class="result-header">
          <i class="fas fa-play-circle"></i>
          <h3>${t.title}</h3>
        </div>
        <div class="result-details">
          <span><i class="fas fa-book-medical"></i> ${t.subject}</span>
          <span><i class="fas fa-building"></i> ${t.platform}</span>
        </div>
      </div>
    `).join("")}}class v{constructor(){this.featuredContent=[{title:"Latest Updates",description:"New lectures added daily across all platforms",icon:"fas fa-star"},{title:"Study Progress",description:"Track your learning journey",icon:"fas fa-chart-line"},{title:"Quick Access",description:"Jump to your favorite subjects",icon:"fas fa-bolt"}]}async render(){const s=document.createElement("div");return s.className="home-page",s.innerHTML=`
      <div class="welcome-section">
        <h2>Welcome to LASTPULSE</h2>
        <p style="font-style: italic; font-size: 1.1em; color: #666; margin-top: 1rem;">„If he is a God than I am a Bloody Doctor"</p>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <i class="fas fa-play-circle"></i>
          <h3>2000+</h3>
          <p>Video Lectures</p>
        </div>
        <div class="stat-card">
          <i class="fas fa-book"></i>
          <h3>50+</h3>
          <p>Subjects Covered</p>
        </div>
        <div class="stat-card">
          <i class="fas fa-graduation-cap"></i>
          <h3>3</h3>
          <p>Top Platforms</p>
        </div>
      </div>
      <div class="quick-actions">
        <h3>Quick Actions</h3>
        <div class="action-buttons">
          <button class="action-btn" id="browseVideos">
            <i class="fas fa-video"></i>
            Browse Videos
          </button>
          <button class="action-btn" id="searchContent">
            <i class="fas fa-search"></i>
            Search Content
          </button>
        </div>
      </div>
      <div class="featured-section">
        <h3>Featured</h3>
        <div class="featured-grid">
          ${this.featuredContent.map(a=>`
            <div class="featured-card">
              <i class="${a.icon}"></i>
              <h4>${a.title}</h4>
              <p>${a.description}</p>
            </div>
          `).join("")}
        </div>
      </div>
    `,setTimeout(()=>{const a=s.querySelector("#browseVideos"),t=s.querySelector("#searchContent");a.onclick=()=>{document.querySelector(".bottom-nav").querySelector("a:nth-child(2)").click()},t.onclick=()=>{document.querySelector(".bottom-nav").querySelector("a:nth-child(3)").click()}},100),s}}class S{constructor(){this.platformSelector=new m,this.marrowSubjectList=new f,this.damsSubjectList=new p,this.prepladderSubjectList=new b,this.searchPage=new y,this.homePage=new v,this.selectedPlatform=null,this.selectedSubject=null,this.currentView="home",this.init()}init(){document.addEventListener("platformSelect",e=>{this.selectedPlatform=e.detail,this.currentView="subjects",this.updateView()}),document.addEventListener("subjectSelect",e=>{this.selectedSubject=e.detail.subject,this.currentView="lectures",this.updateView()}),document.getElementById("searchInput").addEventListener("input",e=>{this.handleSearch(e.target.value)}),document.getElementById("backBtn").addEventListener("click",()=>this.handleBack());const t=document.querySelector(".bottom-nav");t.addEventListener("click",e=>{const c=e.target.closest("a");if(!c)return;switch(e.preventDefault(),t.querySelectorAll("a").forEach(l=>l.classList.remove("active")),c.classList.add("active"),c.querySelector("span").textContent){case"Home":this.currentView="home";break;case"Videos":this.currentView="platforms";break;case"Search":this.currentView="search";break}this.updateView()}),this.updateView()}handleBack(){this.currentView==="lectures"?(this.currentView="subjects",this.selectedSubject=null):this.currentView==="subjects"&&(this.currentView="platforms",this.selectedPlatform=null),this.updateView()}handleSearch(s){s=s.toLowerCase(),this.currentView==="lectures"?document.querySelectorAll(".lecture-card").forEach(t=>{const e=t.querySelector("h3").textContent.toLowerCase();t.style.display=e.includes(s)?"flex":"none"}):this.currentView==="subjects"?document.querySelectorAll(".subject-card").forEach(t=>{const e=t.textContent.toLowerCase();t.style.display=e.includes(s)?"block":"none"}):document.querySelectorAll(".platform-selector button").forEach(t=>{const e=t.textContent.toLowerCase();t.style.display=e.includes(s)?"flex":"none"})}async updateView(){const s=document.querySelector("main");s.innerHTML="";const a=document.getElementById("pageTitle"),t=document.getElementById("backBtn");if(this.currentView==="home")a.textContent="NEXTPULSE",t.style.display="none",s.appendChild(await this.homePage.render());else if(this.currentView==="search")a.textContent="Search",t.style.display="none",s.appendChild(this.searchPage.render());else if(this.currentView==="platforms")a.textContent="Select Platform",t.style.display="none",s.appendChild(this.platformSelector.render());else if(this.currentView==="subjects"){a.textContent=`${this.selectedPlatform.toUpperCase()} Subjects`,t.style.display="block";let e;switch(this.selectedPlatform){case"marrow":e=this.marrowSubjectList;break;case"dams":e=this.damsSubjectList;break;case"prepladder":e=this.prepladderSubjectList;break}s.appendChild(e.render(this.selectedPlatform))}else if(this.currentView==="lectures"){a.textContent=`${this.selectedSubject} Lectures`,t.style.display="block";const e=this.selectedPlatform,c=this.selectedSubject.toLowerCase();window.location.href=`platforms/${e}/${e}-${c}.html`}}}new S;
