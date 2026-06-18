import { useState } from 'react'
import axios from "axios"
import * as pdfjsLib from 'pdfjs-dist'
import { GoogleGenerativeAI } from '@google/generative-ai'
import ReactMarkdown from 'react-markdown'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

function InputForm() {

  const [formData, setFormData] = useState({
    github: '',
    leetcode: '',
    skills: '',
    cgpa: ''
  })

  const [githubData, setGithubData] = useState(null)
  const [githubError, setGithubError] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  async function handlePdfUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = async (event) => {
      const typedArray = new Uint8Array(event.target.result)
      const pdf = await pdfjsLib.getDocument(typedArray).promise

      let fullText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items.map(item => item.str).join(' ')
        fullText += pageText + '\n'
      }

      setResumeText(fullText)
      console.log('Extracted text:', fullText)
    }

    reader.readAsArrayBuffer(file)
  }

  async function fetchGithub() {
    const username = formData.github.trim().split('/').pop()

    if (!username) {
      setGithubError('Please enter a GitHub URL first')
      return
    }

    try {
      const res = await axios.get(`https://api.github.com/users/${username}`)
      const data = res.data

      setGithubData({
        username: data.login,
        name: data.name,
        repos: data.public_repos,
        followers: data.followers,
        joined: data.created_at.split('T')[0]
      })

      setGithubError('')

    } catch (err) {
      console.log('Error:', err)
      setGithubError('GitHub user not found. Check the URL.')
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setResult('')

    const prompt = `
You are an expert placement counselor for engineering students in India.

Analyze this student's profile and give a detailed placement readiness report:

RESUME:
${resumeText || 'Not provided'}

GITHUB PROFILE:
- Name: ${githubData?.name || 'Not provided'}
- Public Repos: ${githubData?.repos || 'Not provided'}
- Followers: ${githubData?.followers || 'Not provided'}
- Joined GitHub: ${githubData?.joined || 'Not provided'}

LEETCODE STATS:
${formData.leetcode || 'Not provided'}

SKILLS:
${formData.skills || 'Not provided'}

CGPA:
${formData.cgpa || 'Not provided'}

IMPORTANT INSTRUCTIONS:
- First, carefully read the RESUME text above and find the student's B.Tech graduation year (e.g. "B.Tech 2027", "Expected graduation: 2027", "2023-2027").
- B.Tech is a 4-year program. Calculate the current year of study using this logic:
  - If graduation year is 2026 → 4th year (final year)
  - If graduation year is 2027 → 3rd year
  - If graduation year is 2028 → 2nd year
  - If graduation year is 2029 → 1st year
  (Assume today's date is June 2026 when doing this calculation)
- Clearly state in your report: "This student is currently in their Xth year (graduating in YYYY)."
- Do NOT guess their year of study from GitHub join date or any other signal — only use the resume's graduation year and the calculation above.
- If no graduation year is mentioned in the resume, say "Year of study not mentioned in resume" instead of guessing.

Please provide:
1. Resume Feedback (2-3 lines)
2. GitHub Assessment (2-3 lines)
3. LeetCode Assessment (2-3 lines)
4. Overall Placement Readiness Score out of 100
5. Top 3 things to improve in the next 30 days

Be specific, honest, and encouraging.
    `

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
      const response = await model.generateContent(prompt)
      const text = response.response.text()
      setResult(text)
    } catch (err) {
      console.log(err)
      setResult('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div>
      <h2>ANALYZE YOUR PROFILE</h2>

      {/* PDF Upload */}
      <label className="upload-label" htmlFor="pdf-upload">
        📄 {resumeText ? `✅ Resume uploaded! (${resumeText.length} characters)` : 'Click to upload Resume PDF'}
      </label>
      <input
        id="pdf-upload"
        className="hidden-input"
        type="file"
        accept=".pdf"
        onChange={handlePdfUpload}
      />

      {/* GitHub */}
      <div className="github-row">
        <input
          type="text"
          name="github"
          placeholder="GitHub URL e.g. https://github.com/sam"
          value={formData.github}
          onChange={handleChange}
        />
        <button className="btn-secondary" onClick={fetchGithub}>
          Fetch GitHub
        </button>
      </div>

      {githubError && <p className="error">{githubError}</p>}

      {githubData && (
        <div className="success-box">
          <p>✅ GitHub fetched!</p>
          <p>Name: {githubData.name} &nbsp;|&nbsp; Repos: {githubData.repos} &nbsp;|&nbsp; Followers: {githubData.followers}</p>
        </div>
      )}

      {/* LeetCode */}
      <input
        type="text"
        name="leetcode"
        placeholder="LeetCode stats e.g. Easy: 45, Medium: 23, Hard: 2"
        value={formData.leetcode}
        onChange={handleChange}
      />

      {/* Skills */}
      <input
        type="text"
        name="skills"
        placeholder="Skills (e.g. React, Node, SQL, Python)"
        value={formData.skills}
        onChange={handleChange}
      />

      {/* CGPA */}
      <input
        type="number"
        name="cgpa"
        placeholder="CGPA (e.g. 7.8)"
        value={formData.cgpa}
        onChange={handleChange}
      />

      {/* Analyze Button */}
      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze profile'}
      </button>
      
      {/* Loading message */}
      {loading && (
        <div className="loading-row">
          <span className="spinner"></span>
          <span>Analyzing your profile...</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="report-box">
          <h3 className="report-title">⚡ Your Placement Report</h3>
          <div className="report-content">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      )}

    </div>
  )
}

export default InputForm