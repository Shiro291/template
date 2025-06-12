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
  const [filePath, setFilePath] = useState('levels.js');
  const [imageDir, setImageDir] = useState('assets'); // New state for image directory
  
  // GitHub configuration
  const GITHUB_OWNER = "Shiro291";
  const GITHUB_REPO = "EneBoard";
  
  // State untuk tutorial
  const [showTutorial, setShowTutorial] = useState(false);

  const generateUniqueFilename = (originalName) => {
    const ext = originalName.split('.').pop();
    const base = originalName.replace(`.${ext}`, '');
    const timestamp = Date.now();
    return `${base}-${timestamp}.${ext}`;
  };

  const addLog = (type, message) => {
    const newLog = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const fetchJsFile = async () => {
    if (!githubToken) {
      setError('Silakan masukkan token GitHub Anda terlebih dahulu');
      return;
    }
    
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,  {
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
      
      // Decode base64 content with proper UTF-8 handling
      const decoder = new TextDecoder('utf-8');
      const content = decoder.decode(atob(data.content));
      setFileContent(content);
      addLog('FETCH_SUCCESS', `Berhasil mengambil file ${filePath}`);
      setError('');
    } catch (error) {
      addLog('FETCH_ERROR', error.message);
      setError(`Gagal mengambil file: ${error.message}`);
    }
  };

  const replaceCode = () => {
    if (!searchString.trim()) {
      setError('Silakan masukkan string pencarian');
      return;
    }

    // Normalize whitespace for search
    const normalizedSearch = searchString.replace(/\s+/g, ' ').trim();
    const normalizedContent = fileContent.replace(/\s+/g, ' ').trim();

    if (!normalizedContent.includes(normalizedSearch)) {
      setError('String pencarian tidak ditemukan dalam konten file');
      addLog('REPLACE_ERROR', 'String pencarian tidak ditemukan');
      return;
    }

    try {
      // Use regex with global flag for all occurrences
      const regex = new RegExp(searchString, 'g');
      const newContent = fileContent.replace(regex, replaceString);
      setFileContent(newContent);
      addLog('REPLACE_SUCCESS', `Berhasil mengganti "${searchString}" dengan "${replaceString}"`);
      setError('');
    } catch (error) {
      addLog('REPLACE_ERROR', error.message);
      setError(`Gagal mengganti: ${error.message}`);
    }
  };

  const updateJsFile = async () => {
    if (!githubToken) {
      setError('Silakan masukkan token GitHub Anda terlebih dahulu');
      return;
    }
    
    if (!fileContent.trim()) {
      setError('Konten file tidak boleh kosong');
      return;
    }

    try {
      // Encode with proper UTF-8 handling
      const encoder = new TextEncoder();
      const encodedContent = btoa(encoder.encode(fileContent));

      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,  {
        method: "PUT",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json"
        },
        body: JSON.stringify({
          message: "Update file via web app",
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
      addLog('UPDATE_SUCCESS', `Berhasil memperbarui ${filePath} di GitHub`);
      setError('');
    } catch (error) {
      addLog('UPDATE_ERROR', error.message);
      setError(`Gagal memperbarui file: ${error.message}`);
    }
  };

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

  const handleOptionImageChange = (index, file) => {
    const newOptions = [...options];
    newOptions[index].image = file;
    setOptions(newOptions);
  };

  const toggleCorrectAnswer = (index) => {
    const newOptions = [...options];
    newOptions.forEach((option, i) => {
      newOptions[i].correct = i === index;
    });
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, { text: '', image: null, correct: false }]);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const generateTemplate = () => {
    if (!question.trim()) {
      setError('Silakan masukkan pertanyaan');
      return;
    }

    if (options.filter(opt => opt.text.trim()).length < 2) {
      setError('Silakan masukkan minimal dua opsi');
      return;
    }

    if (!icon.trim()) {
      setError('Silakan masukkan ikon');
      return;
    }

    let processedQuestion = question;
    const imagePaths = [];
    
    questionImages.forEach(img => {
      const uniqueFilename = generateUniqueFilename(img.file.name);
      processedQuestion = processedQuestion.replace(
        img.placeholder,
        `${imageDir}/${uniqueFilename}`
      );
      imagePaths.push({ placeholder: img.placeholder, path: `${imageDir}/${uniqueFilename}` });
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
          template += `    imageUrl: '${imageDir}/${uniqueFilename}'\n`;
        }
        
        template += `  }${index < options.length - 1 ? ',' : ''}\n`;
      }
    });
    
    template += `],\n`;
    template += `icon: '${icon}'`;

    setOutput(template);
    setError('');
  };

  const uploadToGitHub = async (file, filename) => {
    const path = `${imageDir}/${filename}`;
    
    try {
      const reader = new FileReader();
      const fileAsBase64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

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

      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,  {
        method: "PUT",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json"
        },
        body: JSON.stringify({
          message: "Upload gambar via web app",
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

  const handleGitHubUpload = async () => {
    if (!githubToken) {
      setError('Silakan masukkan token GitHub Anda terlebih dahulu');
      return;
    }
    
    setUploadStatus({ loading: true });
    
    try {
      for (const img of questionImages) {
        const filename = generateUniqueFilename(img.file.name);
        const success = await uploadToGitHub(img.file, filename);
        setUploadStatus(prev => ({ ...prev, [`questionImage-${img.id}`]: success }));
      }
      
      for (let i = 0; i < options.length; i++) {
        if (options[i].image) {
          const filename = generateUniqueFilename(options[i].image.name);
          const success = await uploadToGitHub(options[i].image, filename);
          setUploadStatus(prev => ({ ...prev, [`option${i}`]: success }));
        }
      }
      
      setUploadStatus(prev => ({ ...prev, loading: false, complete: true }));
      addLog('UPLOAD_SUCCESS', 'Berhasil mengunggah gambar ke GitHub');
    } catch (err) {
      addLog('UPLOAD_ERROR', err.message);
      setError('Gagal mengunggah: ' + err.message);
      setUploadStatus(prev => ({ ...prev, loading: false }));
    }
  };

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
      setError('Gagal menyalin ke clipboard. Silakan pilih teks secara manual.');
    }
    
    document.body.removeChild(textArea);
  };

  const handleQuestionChange = (e) => {
    setQuestion(e.target.value);
  };

  const handleIconChange = (e) => {
    setIcon(e.target.value);
  };

  const handleOptionTextChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index].text = value;
    setOptions(newOptions);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Pembuat Template Kuis & Editor GitHub</h1>
          <p className="text-lg text-gray-600">Buat kuis dan edit file GitHub dalam satu alat terintegrasi</p>
        </div>

        {/* Petunjuk Penggunaan */}
        <div className="mb-6 bg-white rounded-xl shadow-xl p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Cara Penggunaan</h2>
            <button
              onClick={() => setShowTutorial(!showTutorial)}
              className="text-indigo-600 hover:text-indigo-800"
            >
              {showTutorial ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
          
          {showTutorial && (
            <div className="mt-4 space-y-4 text-sm text-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-800">Untuk Membuat Kuis:</h3>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Masukkan token GitHub Anda (lihat bagian bawah untuk cara membuat token)</li>
                    <li>Tentukan folder gambar menggunakan kolom "Direktori Gambar"</li>
                    <li>Unggah gambar menggunakan tombol "Insert Image Placeholder"</li>
                    <li>Tambahkan opsi jawaban dan tandai jawaban yang benar</li>
                    <li>Klik "Generate Template" untuk membuat template kuis</li>
                    <li>Klik "Upload to GitHub" untuk menyimpan gambar ke repositori</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-800">Untuk Mengedit File GitHub:</h3>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Masukkan jalur file (misal: "levels.js" atau "src/data/questions.js")</li>
                    <li>Klik "Fetch File" untuk mengambil konten file dari GitHub</li>
                    <li>Edit konten file di area editor</li>
                    <li>Gunakan fitur "Search & Replace" untuk mengganti kode</li>
                    <li>Klik "Update File" untuk menyimpan perubahan ke GitHub</li>
                  </ol>
                </div>
              </div>

              {/* Panduan untuk guru */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-800">Petunjuk untuk Guru:</h3>
                <div className="mt-2 space-y-2">
                  <p>1. Buat token GitHub: <a 
                    href="https://github.com/settings/tokens"  
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 underline"
                  >Klik di sini</a></p>
                  <p>2. Masukkan token di kolom "GitHub Token"</p>
                  <p>3. Untuk membuat kuis:
                    <ul className="list-disc list-inside ml-4">
                      <li>Masukkan pertanyaan dan gambar</li>
                      <li>Tambahkan opsi jawaban</li>
                      <li>Klik "Generate Template"</li>
                      <li>Klik "Upload to GitHub" untuk menyimpan gambar</li>
                    </ul>
                  </p>
                  <p>4. Untuk mengedit file:
                    <ul className="list-disc list-inside ml-4">
                      <li>Masukkan jalur file (misal: "levels.js")</li>
                      <li>Klik "Fetch File"</li>
                      <li>Edit konten file di area editor</li>
                      <li>Klik "Update File" untuk menyimpan perubahan</li>
                    </ul>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Warning */}
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 01-16 0 8 8 0 0116 0zm-7-4a1 1 0 00-2 0v6a1 1 0 002 0V6zm4 0a1 1 0 00-2 0v6a1 1 0 002 0V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Peringatan Keamanan</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Token ini memberikan akses penuh ke akun GitHub Anda. JANGAN gunakan alat ini di website umum.</p>
              </div>
            </div>
          </div>
        </div>

        {/* GitHub Token Input */}
        <div className="mb-6">
          <label htmlFor="github-token" className="block text-sm font-medium text-gray-700 mb-2">
            Token GitHub Pribadi
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
            Dapatkan token Anda dari{' '}
            <a 
              href="https://github.com/settings/tokens"  
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline"
            >
              Pengaturan Token GitHub
            </a>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quiz Template Generator Section */}
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pembuat Template Kuis</h2>
              
              {/* Image Directory Input */}
              <div className="mb-6">
                <label htmlFor="image-dir" className="block text-sm font-medium text-gray-700 mb-2">
                  Direktori Gambar (contoh: "assets")
                </label>
                <input
                  id="image-dir"
                  type="text"
                  value={imageDir}
                  onChange={(e) => setImageDir(e.target.value)}
                  placeholder="assets"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Folder tempat menyimpan gambar di GitHub
                </p>
              </div>

              {/* Question Input with Images */}
              <div className="mb-6">
                <div className="flex flex-wrap justify-between items-center mb-4">
                  <label htmlFor="question" className="block text-sm font-medium text-gray-700">
                    Pertanyaan (Gunakan [image-1], [image-2], dll. untuk menempatkan gambar)
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
                    Masukkan Placeholder Gambar
                  </button>
                </div>
                
                <textarea
                  id="question"
                  rows="5"
                  value={question}
                  onChange={handleQuestionChange}
                  placeholder="Masukkan pertanyaan di sini. Gunakan [image-1], [image-2], dll."
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

                {/* Display Uploaded Images */}
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
                              alert(`Berhasil menyalin ${img.placeholder} ke clipboard!`);
                            }}
                            className="text-indigo-600 hover:text-indigo-800 text-xs"
                          >
                            Salin
                          </button>
                        </div>
                        <img 
                          src={URL.createObjectURL(img.file)} 
                          alt={`Pertanyaan ${index + 1}`} 
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
                  Ikon (Emoji atau karakter)
                </label>
                <input
                  id="icon"
                  type="text"
                  value={icon}
                  onChange={handleIconChange}
                  placeholder="Masukkan emoji atau simbol"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Options Section */}
              <div className="mb-6">
                <div className="flex flex-wrap justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Opsi Jawaban</h2>
                  <button
                    type="button"
                    onClick={addOption}
                    className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 mt-2 sm:mt-0"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Tambah Opsi
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
                          aria-label="Hapus opsi"
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
                            placeholder={`Opsi ${index + 1}`}
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
                      uploadStatus.loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {uploadStatus.loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Mengunggah...
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 3 3h10a3 3 0 3 3h6m-6-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        Upload ke GitHub
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Upload Status */}
              {uploadStatus.complete && (
                <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
                  <p className="text-sm">Upload gambar berhasil!</p>
                </div>
              )}
            </div>
          </div>

          {/* Direct GitHub File Editing Section */}
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Editor GitHub</h2>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  Edit file apa saja di GitHub dengan memasukkan jalurnya
                </p>
                
                <div className="mb-4">
                  <label htmlFor="file-path" className="block text-sm font-medium text-gray-700 mb-1">
                    Jalur File (contoh: "levels.js" atau "src/data/questions.js")
                  </label>
                  <input
                    id="file-path"
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="levels.js"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={fetchJsFile}
                    disabled={!githubToken}
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      !githubToken ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    Ambil File
                  </button>
                  
                  <button
                    type="button"
                    onClick={updateJsFile}
                    disabled={!githubToken || !fileContent}
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      !githubToken || !fileContent ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    Perbarui File
                  </button>
                </div>
              </div>

              {/* Code Replacement Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Penggantian Kode</h3>
                
                <div className="mb-4 text-sm text-gray-600">
                  <p>⚠️ Pastikan format pencarian sesuai dengan file asli:</p>
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>Jangan tambahkan spasi/titik koma ekstra</li>
                    <li>Kopikan langsung dari area editor di bawah</li>
                    <li>Pastikan menggunakan petik dua (") bukan petik satu (')</li>
                  </ul>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="search-string" className="block text-sm font-medium text-gray-700 mb-1">
                      Cari Kode
                    </label>
                    <input
                      id="search-string"
                      type="text"
                      value={searchString}
                      onChange={(e) => setSearchString(e.target.value)}
                      placeholder="Masukkan kode yang ingin diganti"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="replace-string" className="block text-sm font-medium text-gray-700 mb-1">
                      Ganti dengan
                    </label>
                    <input
                      id="replace-string"
                      type="text"
                      value={replaceString}
                      onChange={(e) => setReplaceString(e.target.value)}
                      placeholder="Masukkan kode baru"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={replaceCode}
                  disabled={!searchString || !fileContent}
                  className={`inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    !searchString || !fileContent ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Ganti Kode
                </button>
              </div>

              {/* Code Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konten File
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">Log Perubahan</h3>
                
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-sm text-gray-500">Belum ada perubahan dicatat</p>
                  ) : (
                    <ul className="space-y-2">
                      {logs.map((log, index) => (
                        <li key={index} className="text-xs text-gray-600 border-b border-gray-100 pb-2">
                          <span className="font-mono">{new Date(log.timestamp).toLocaleString()}</span> - 
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
                        <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Tips Format Emoji:</h3>
                <div className="flex flex-wrap gap-2">
                  {['💡', '⚡', '🔥', '💧', '☀️', '🔌', '🔋', '⚡'].map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-xl"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 01-8 8H8a8 8 0 01-8-8 8 8 0 018-8z"></path>
                  <path fillRule="evenodd" d="M8 7a1 1 0 011 1v4a1 1 0 01-2 0V8a1 1 0 011-1z"></path>
                  <path fillRule="evenodd" d="M8 10a1 1 0 011 1v4a1 1 0 01-2 0v-4a1 1 0 011-1z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
