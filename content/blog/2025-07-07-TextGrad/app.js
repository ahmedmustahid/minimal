window.addEventListener("load", function () {
  console.log("Window loaded, starting script...");
  console.log("KaTeX available at DOM load?", typeof katex !== 'undefined');
  console.log("Window katex:", window.katex);
  
  // The ID of the container in index.html
  const postContainerId = "calculus-post";
  // The path to your Markdown file
  const markdownFilePath = "calculus-for-words.md";

  const container = document.getElementById(postContainerId);
  if (!container) {
    console.error(`Error: Container with ID #${postContainerId} not found.`);
    return;
  }
  
  console.log("Container found, fetching markdown...");

  // Fetch the Markdown content
  fetch(markdownFilePath)
    .then((response) => {
      console.log("Fetch response:", response);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      return response.text();
    })
    .then((md) => {
      console.log("Markdown content loaded:", md.substring(0, 100) + "...");
      // --- Parse Front Matter ---
      const frontMatterRegex = /^---\s*([\s\S]*?)\s*---/;
      const match = md.match(frontMatterRegex);
      const frontMatter = {};
      let content = md;

      if (match) {
        const frontMatterStr = match[1];
        content = md.substring(match[0].length).trim();
        frontMatterStr.split("\n").forEach((line) => {
          const [key, ...valueParts] = line.split(":");
          if (key && valueParts.length > 0) {
            frontMatter[key.trim()] = valueParts
              .join(":")
              .trim()
              .replace(/"/g, "");
          }
        });
      }

      // --- Inject Basic Content into the DOM first ---
      container.querySelector('[data-key="date"]').textContent =
        frontMatter.date || "";
      container.querySelector('[data-key="title"]').textContent =
        frontMatter.title || "";
      container.querySelector('[data-key="title-link"]').href =
        `blog/${(frontMatter.title || "post").toLowerCase().replace(/\s+/g, "-")}/`;

      // --- Render LaTeX using KaTeX ---
      // Wait for KaTeX to be available before rendering
      let katexWaitCount = 0;
      const maxWaitCount = 50; // Wait max 5 seconds
      
      function renderLatex() {
        console.log("renderLatex called, checking for katex...");
        console.log("typeof katex:", typeof katex);
        console.log("window.katex:", window.katex);
        console.log("typeof window.katex:", typeof window.katex);
        
        if (typeof katex === 'undefined' && typeof window.katex === 'undefined') {
          katexWaitCount++;
          console.log(`katex not loaded yet, waiting... (${katexWaitCount}/${maxWaitCount})`);
          
          if (katexWaitCount >= maxWaitCount) {
            console.log("KaTeX failed to load, rendering without LaTeX");
            renderWithoutKatex();
            return;
          }
          
          setTimeout(renderLatex, 100);
          return;
        }
        
        console.log("katex loaded, processing content...");
        
        // Get the katex reference (either global or window)
        const katexRenderer = window.katex || katex;
        
        // Replace $...$ with LaTeX BEFORE markdown conversion
        const contentWithLatex = content.replace(
          /\$\$([\s\S]*?)\$\$/g,
          (match, p1) => {
            try {
              console.log("Processing LaTeX:", p1);
              return katexRenderer.renderToString(p1.trim(), {
                displayMode: false, // Changed to false for inline rendering
                throwOnError: false,
              });
            } catch (e) {
              console.error("LaTeX error:", e);
              return `Error rendering LaTeX: ${e.message}`;
            }
          },
        );
        
        console.log("Content with LaTeX:", contentWithLatex.substring(0, 200) + "...");
        
        // --- Convert Markdown to HTML ---
        // Use marked.js to convert the main content to HTML
        const htmlContent = marked.parse(contentWithLatex);
        
        console.log("HTML content:", htmlContent.substring(0, 200) + "...");

        // --- Inject Content into the DOM ---
        const contentElement = container.querySelector('[data-key="content"]');
        if (contentElement) {
          contentElement.innerHTML = htmlContent;
          console.log("Content injected successfully");
        } else {
          console.error("Content element not found");
        }
      }
      
      function renderWithoutKatex() {
        console.log("Rendering content without KaTeX...");
        
        // --- Convert Markdown to HTML without LaTeX processing ---
        const htmlContent = marked.parse(content);
        
        console.log("HTML content (no LaTeX):", htmlContent.substring(0, 200) + "...");

        // --- Inject Content into the DOM ---
        const contentElement = container.querySelector('[data-key="content"]');
        if (contentElement) {
          contentElement.innerHTML = htmlContent;
          console.log("Content injected successfully (without LaTeX)");
        } else {
          console.error("Content element not found");
        }
      }
      
      renderLatex();
    })
    .catch((error) => {
      console.error("Error fetching or parsing Markdown file:", error);
      container.querySelector('[data-key="content"]').innerHTML =
        `<p>Failed to load post. Please check the console for details.</p>`;
    });
});
