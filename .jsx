import { useState } from 'react';

export default function App() {
  const [question, setQuestion] = useState('');
  const [questionImages, setQuestionImages] = useState([]);
  const [options, setOptions] = useState([
    { text: '', image: null, correct: false },
    { text: '', image: null, correct: false },
  ]);
  const [icon, setIcon] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [uploadStatus, setUploadStatus] = useState({});
  const [fileContent, setFileContent] = useState('');
  const [fileSha, setFileSha] = useState('');
  const [logs, setLogs] = useState([]);
  const [searchString, setSearchString] = useState('');
  const [replaceString, setReplaceString] = useState('');
  
  // GitHub configuration
  const GITHUB_OWNER = "Shiro291";
  const GITHUB_REPO = "EneBoard";
  const GITHUB_PATH = "assets/";
  const JS_FILE_PATH = "levels.js";

  const generateUniqueFilename = (originalName) => {
    const ext = originalName.split('.').pop();
    const base = originalName.replace(`.${ext}`, '');
    const timestamp = Date.now();
    return `${base}-${timestamp}.${ext}`;
  };

  // Add log entry
  const addLog = (type, message) => {
    const newLog = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Fetch current levels.js file from GitHub
  const fetchJsFile = async () => {
    if (!githubToken) {
      setError('Please enter your GitHub token first');
      return;
    }
    
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${JS_FILE_PATH}`,  {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json"
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
      }
      
      const data = await response.json();
      setFileSha(data.sha);
      
      // Decode base64 content
      const content = atob(data.content);
      setFileContent(content);
      
      addLog('FETCH_SUCCESS', 'Successfully fetched levels.js file');
      setError('');
    } catch (error) {
      addLog('FETCH_ERROR', error.message);
      setError(`Failed to fetch levels.js: ${error.message}`);
    }
  };

  // Replace code in file content
  const replaceCode = () => {
    if (!searchString.trim()) {
      setError('Please enter search string to replace');
      return;
    }

    if (!fileContent.includes(searchString)) {
      setError('Search string not found in file content');
      addLog('REPLACE_ERROR', 'Search string not found');
      return;
    }

    try {
      const newContent = fileContent.replace(searchString, replaceString);
      setFileContent(newContent);
      addLog('REPLACE_SUCCESS', `Replaced "${searchString}" with "${replaceString}"`);
      setError('');
    } catch (error) {
      addLog('REPLACE_ERROR', error.message);
      setError(`Replacement failed: ${error.message}`);
    }
  };

  // Update levels.js on GitHub
  const updateJsFile = async () => {
    if (!githubToken) {
      setError('Please enter your GitHub token first');
      return;
    }
    
    if (!fileContent.trim()) {
      setError('File content cannot be empty');
      return;
    }

    try {
      // Convert content to base64
      const encodedContent = btoa(unescape(encodeURIComponent(fileContent)));

      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${JS_FILE_PATH}`,  {
        method: "PUT",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json"
        },
        body: JSON.stringify({
          message: "Update levels.js via web app",
          content: encodedContent,
          sha: fileSha
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
      }

      const data = await response.json();
      setFileSha(data.content.sha);
      
      addLog('UPDATE_SUCCESS', 'Successfully updated levels.js on GitHub');
      setError('');
    } catch (error) {
      addLog('UPDATE_ERROR', error.message);
      setError(`Failed to update levels.js: ${error.message}`);
    }
  };

  // Handle question image upload
  const handleQuestionImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file, index) => ({
      file,
      id: `image-${questionImages.length + index + 1}`,
      placeholder: `[image-${questionImages.length + index + 1}]`
    }));
    
    setQuestionImages(prev => [...prev, ...newImages]);
    setError('');
  };

  // Handle option image change
  const handleOptionImageChange = (index, file) => {
    const newOptions = [...options];
    newOptions[index].image = file;
    setOptions(newOptions);
  };

  // Toggle correct answer
  const toggleCorrectAnswer = (index) => {
    const newOptions = [...options];
    newOptions.forEach((option, i) => {
      newOptions[i].correct = i === index;
    });
    setOptions(newOptions);
  };

  // Add new option
  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, { text: '', image: null, correct: false }]);
    }
  };

  // Remove option
  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  // Generate template code
  const generateTemplate = () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    if (options.filter(opt => opt.text.trim()).length < 2) {
      setError('Please enter at least two options');
      return;
    }

    if (!icon.trim()) {
      setError('Please enter an icon');
      return;
    }

    // Replace image placeholders with actual paths
    let processedQuestion = question;
    const imagePaths = [];
    
    questionImages.forEach(img => {
      const uniqueFilename = generateUniqueFilename(img.file.name);
      processedQuestion = processedQuestion.replace(
        img.placeholder,
        `${GITHUB_PATH}${uniqueFilename}`
      );
      imagePaths.push({ placeholder: img.placeholder, path: `${GITHUB_PATH}${uniqueFilename}` });
    });

    let template = `type: 'quiz',\n`;
    template += `question: '${processedQuestion}',\n`;
    
    if (imagePaths.length > 0) {
      template += `imagePaths: {\n`;
      imagePaths.forEach((path, index) => {
        template += `  "${path.placeholder}": "${path.path}"${index < imagePaths.length - 1 ? ',' : ''}\n`;
      });
      template += `},\n`;
    }

    template += `options: [\n`;
    
    options.forEach((option, index) => {
      if (option.text.trim()) {
        template += `  {\n`;
        template += `    text: '${option.text}',\n`;
        template += `    correct: ${option.correct},\n`;
        
        if (option.image) {
          const uniqueFilename = generateUniqueFilename(option.image.name);
          template += `    imageUrl: '${GITHUB_PATH}${uniqueFilename}'\n`;
        }
        
        template += `  }${index < options.length - 1 ? ',' : ''}\n`;
      }
    });
    
    template += `],\n`;
    template += `icon: '${icon}'`;

    setOutput(template);
    setError('');
  };

  // Upload images to GitHub
  const uploadToGitHub = async (file, filename) => {
    const path = `${GITHUB_PATH}${filename}`;
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      const fileAsBase64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      // Get current file SHA if exists
      let currentSha = null;
      try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,  {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json"
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          currentSha = data.sha;
        }
      } catch (err) {
        console.error("Error checking file existence:", err);
      }

      // Upload file to GitHub
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,  {
        method: "PUT",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json"
        },
        body: JSON.stringify({
          message: "Upload image via web app",
          content: fileAsBase64,
          sha: currentSha
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
      }
      
      return true;
    } catch (error) {
      console.error("Upload error:", error);
      return false;
    }
  };

  // Handle GitHub image upload
  const handleGitHubUpload = async () => {
    if (!githubToken) {
      setError('Please enter your GitHub token first');
      return;
    }
    
    setUploadStatus({ loading: true });
    
    try {
      // Upload question images
      for (const img of questionImages) {
        const filename = generateUniqueFilename(img.file.name);
        const success = await uploadToGitHub(img.file, filename);
        setUploadStatus(prev => ({ ...prev, [`questionImage-${img.id}`]: success }));
      }
      
      // Upload option images
      for (let i = 0; i < options.length; i++) {
        if (options[i].image) {
          const filename = generateUniqueFilename(options[i].image.name);
          const success = await uploadToGitHub(options[i].image, filename);
          setUploadStatus(prev => ({ ...prev, [`option${i}`]: success }));
        }
      }
      
      setUploadStatus(prev => ({ ...prev, loading: false, complete: true }));
      addLog('UPLOAD_SUCCESS', 'Successfully uploaded images to GitHub');
    } catch (err) {
      addLog('UPLOAD_ERROR', err.message);
      setError('Upload failed: ' + err.message);
      setUploadStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    const textArea = document.createElement("textarea");
    textArea.value = output;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    document.body.appendChild(textArea);
    
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard. Please manually select the text.');
    }
    
    document.body.removeChild(textArea);
  };

  // Handle question text change
  const handleQuestionChange = (e) => {
    setQuestion(e.target.value);
  };

  // Handle icon change
  const handleIconChange = (e) => {
    setIcon(e.target.value);
  };

  // Handle option text change
  const handleOptionTextChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index].text = value;
    setOptions(newOptions);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Quiz Template & GitHub Editor</h1>
          <p className="text-lg text-gray-600">Create quizzes and edit GitHub files in one integrated tool</p>
        </div>

        {/* Security Warning */}
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 01-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 000-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Security Warning</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>This token grants full access to your GitHub account. Never use this in a public website.</p>
              </div>
            </div>
          </div>
        </div>

        {/* GitHub Token Input */}
        <div className="mb-6">
          <label htmlFor="github-token" className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Personal Access Token
          </label>
          <input
            id="github-token"
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="mt-2 text-sm text-gray-500">
            Get your token from{' '}
            <a 
              href="https://github.com/settings/tokens"  
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline"
            >
              GitHub Tokens Settings
            </a>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quiz Template Generator Section */}
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quiz Template Generator</h2>
              
              {/* Question Input with Images */}
              <div className="mb-6">
                <div className="flex flex-wrap justify-between items-center mb-4">
                  <label htmlFor="question" className="block text-sm font-medium text-gray-700">
                    Question (Use [image-1], [image-2], etc. to place images)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const placeholder = `[image-${questionImages.length + 1}]`;
                      setQuestion(prev => prev ? `${prev}\n\n${placeholder}` : placeholder);
                    }}
                    className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 mt-2 sm:mt-0"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Insert Image Placeholder
                  </button>
                </div>
                
                <textarea
                  id="question"
                  rows="5"
                  value={question}
                  onChange={handleQuestionChange}
                  placeholder="Enter your question here. Use [image-1], [image-2], etc. to place images."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                ></textarea>

                {/* Image Upload Section */}
                <div className="mb-4">
                  <input
                    id="question-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleQuestionImageUpload}
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                </div>

                {/* Display Uploaded Images with Placeholders */}
                {questionImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {questionImages.map((img, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-white">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-mono text-gray-600">{img.placeholder}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(img.placeholder);
                              alert(`Copied ${img.placeholder} to clipboard!`);
                            }}
                            className="text-indigo-600 hover:text-indigo-800 text-xs"
                          >
                            Copy
                          </button>
                        </div>
                        <img 
                          src={URL.createObjectURL(img.file)} 
                          alt={`Question ${index + 1}`} 
                          className="w-full h-auto rounded-md border border-gray-200"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Icon Input */}
              <div className="mb-6">
                <label htmlFor="icon" className="block text-sm font-medium text-gray-700 mb-2">
                  Icon (Emoji or character)
                </label>
                <input
                  id="icon"
                  type="text"
                  value={icon}
                  onChange={handleIconChange}
                  placeholder="Enter an emoji or symbol"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Options Section */}
              <div className="mb-6">
                <div className="flex flex-wrap justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Options</h2>
                  <button
                    type="button"
                    onClick={addOption}
                    className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 mt-2 sm:mt-0"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Add Option
                  </button>
                </div>

                <div className="space-y-4">
                  {options.map((option, index) => (
                    <div 
                      key={index} 
                      className={`border rounded-lg p-4 relative ${option.correct ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                    >
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                          aria-label="Remove option"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      )}
                      
                      <div className="flex items-start space-x-4">
                        {/* Correct Answer Checkbox */}
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={option.correct}
                            onChange={() => toggleCorrectAnswer(index)}
                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </div>
                        
                        <div className="flex-1">
                          {/* Option Text Input */}
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) => handleOptionTextChange(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                          />
                          
                          {/* Option Image Upload */}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleOptionImageChange(index, e.target.files[0])}
                            className="w-full border border-gray-300 rounded-md p-2"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={generateTemplate}
                  className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Generate Template
                </button>
                
                {githubToken && output && (
                  <button
                    type="button"
                    onClick={handleGitHubUpload}
                    disabled={uploadStatus.loading}
                    className={`inline-flex items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
                      uploadStatus.loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {uploadStatus.loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        Upload to GitHub
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Upload Status */}
              {uploadStatus.complete && (
                <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
                  <p className="text-sm">Image upload completed successfully!</p>
                </div>
              )}
            </div>
          </div>

          {/* Direct GitHub File Editing Section */}
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Direct GitHub File Editing</h2>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  Edit <code className="bg-gray-100 px-1 rounded">levels.js</code> directly on GitHub
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={fetchJsFile}
                    disabled={!githubToken}
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      !githubToken ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    Fetch levels.js
                  </button>
                  
                  <button
                    type="button"
                    onClick={updateJsFile}
                    disabled={!githubToken || !fileContent}
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      !githubToken || !fileContent ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    Update levels.js
                  </button>
                </div>
              </div>

              {/* Code Replacement Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Code Replacement</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="search-string" className="block text-sm font-medium text-gray-700 mb-1">
                      Search String
                    </label>
                    <input
                      id="search-string"
                      type="text"
                      value={searchString}
                      onChange={(e) => setSearchString(e.target.value)}
                      placeholder="Exact string to find"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="replace-string" className="block text-sm font-medium text-gray-700 mb-1">
                      Replace With
                    </label>
                    <input
                      id="replace-string"
                      type="text"
                      value={replaceString}
                      onChange={(e) => setReplaceString(e.target.value)}
                      placeholder="New code to insert"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={replaceCode}
                  disabled={!searchString || !fileContent}
                  className={`mt-2 inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    !searchString || !fileContent ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Replace Code
                </button>
              </div>

              {/* Code Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  levels.js Content
                </label>
                <textarea
                  rows="15"
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-indigo-500 focus:border-indigo-500"
                ></textarea>
              </div>

              {/* Logs Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Change Logs</h3>
                
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-sm text-gray-500">No changes recorded yet</p>
                  ) : (
                    <ul className="space-y-2">
                      {logs.map((log, index) => (
                        <li key={index} className="text-xs text-gray-600 border-b border-gray-100 pb-2">
                          <span className="font-mono">{log.timestamp}</span> - 
                          <span className={`ml-2 px-2 py-0.5 rounded text-white text-xs ${
                            log.type.includes('ERROR') ? 'bg-red-500' : 'bg-green-500'
                          }`}>
                            {log.type}
                          </span>
                          <p className="mt-1">{log.message}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Output Section */}
        {output && (
          <div className="mt-8 bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 sm:mb-0">Generated Template</h2>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm leading-4 font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {copied ? (
                    <>
                      <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 00-2 2v1a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0 h2a2 2 0 012 2v3m2 4v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h12a2 2 0 012 2v4m-8 0h8"></path>
                      </svg>
                      Copy to Clipboard
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="whitespace-pre-wrap">
                  <code>{output}</code>
                </pre>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <p>Images will be uploaded to: <code className="bg-gray-100 p-1 rounded">assets/</code> directory</p>
                <p className="mt-1">
                  Make sure your GitHub repository exists at: 
                  <a 
                    href="https://github.com/Shiro291/EneBoard"  
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 underline ml-1"
                  >
                    github.com/Shiro291/EneBoard
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 0-16 0 8 8 0 0016 0zM8 7a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 000-2H8zm0 3a1 1 0 000 2h1a1 1 0 000-2H8z" clipRule="evenodd" />
                  <path d="M6 1 2 5.707A1 1 0 006.707 7h2.586A1 1 0 0010 6.293L6.364 2.636a1.707 1.707 0 00-2.414 0l-.707.707A1.707 1.707 0 001.757 5.07l14.142 14.142A2 2 0 0018.257 18l-2.12-.424a1 1 0 00-.771-.014L15 17.1l-.17-.075L14.45 17h-2.89l-.17.065-.03.013L9 16.293l-2.122 2.121-.707-.707 3.536-3.536A1 1 0 009 13.516l-.76-.134A1 1 0 007.46 13h-.92a1 1 0 00-1 1v.01a1 1 0 001 1h13a1 0 000-2h-.01zM3.857 7.293a.5.5 0 01-.921-.407l-.148-.324A1 1 0 012 5.383V4.5a1 1 0 011-1h14a1 1 0 011 1v.883a1 1 0 01-.253.739l-.96.96c-.445.445-1.02 1.268-2 2.288-.98-.98-1.694-2.071-2.294-2.731-.104-.12-.272-.24-.5-.24h-.04a.25.25 0 00-.196.068l-.041-.03a1 1 0 00-.704.26s-.083.052-.1.077l-.106.053c-.118.03-.283.09-.5.09-.158 0-.31-.034-.46-.092l-.11-.047-.052-.023-.094-.03a1 1 0 00-.25-.66c.02-.022.036-.05.048-.077l.04-.086.081-.189c.032-.078.062-.158.087-.238l.03-.118.02-.094.015-.088.01-.067.004-.051.017-.143.01-.11l.01-.127-.01-.088-.014-.127-.004-.051-.01-.067-.017-.143-.01-.094-.03-.189-.062-.267l-.04-.118a1 1 0 00-.192-.447c-.047-.09-.107-.17-.18-.232l-.09-.064-.113-.066-.116-.056-.11-.046-.19-.06-.267-.077-.052-.017-.105-.037-.158-.06a1 1 0 00-.149-.06 1 1 0 00-.094.022 1 1 0 00-.094-.022 1 1 0 00-.158.06 1 1 0 00-.19.06c-.077.02-1.113.448-1.113 1.07z"></path>
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
