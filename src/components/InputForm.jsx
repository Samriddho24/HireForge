import { useState } from 'react'
import axios from "axios"
import * as pdfjsLib from 'pdfjs-dist'

// This is fine outside - it's just a config, not a hook
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js`

function InputForm() {

  // ✅ ALL useState calls inside the function
  const [formData, setFormData] = useState({
    resume: '',
    github: '',
    leetcode: '',
    skills: '',
    cgpa: ''
  })
  const [githubData, setGithubData] = useState(null)
  const [githubError, setGithubError] = useState('')
  const [resumeText, setResumeText] = useState('')

  // ✅ ALL functions inside the function
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

  function handleSubmit() {
    console.log('Form Data:', formData)
    console.log('GitHub Data:', githubData)
    console.log('Resume Text:', resumeText)
  }

  return (
    <div>
      <h2>Enter Your Profile</h2>

      <input
        type="file"
        accept=".pdf"
        onChange={handlePdfUpload}
      />
      {resumeText && <p>✅ Resume extracted! ({resumeText.length} characters)</p>}

      <textarea
        name="resume"
        placeholder="Paste your resume summary..."
        value={formData.resume}
        onChange={handleChange}
      />

      <div>
        <input
          type="text"
          name="github"
          placeholder="GitHub profile URL e.g. https://github.com/sam"
          value={formData.github}
          onChange={handleChange}
        />
        <button onClick={fetchGithub}>Fetch GitHub Data</button>
      </div>

      {githubError && <p style={{color: 'red'}}>{githubError}</p>}

      {githubData && (
        <div>
          <p>✅ GitHub fetched!</p>
          <p>Name: {githubData.name}</p>
          <p>Repos: {githubData.repos}</p>
          <p>Followers: {githubData.followers}</p>
          <p>Joined: {githubData.joined}</p>
        </div>
      )}

      <input
        type="text"
        name="leetcode"
        placeholder="LeetCode username"
        value={formData.leetcode}
        onChange={handleChange}
      />

      <input
        type="text"
        name="skills"
        placeholder="Skills (e.g. React, Node, SQL)"
        value={formData.skills}
        onChange={handleChange}
      />

      <input
        type="number"
        name="cgpa"
        placeholder="CGPA (e.g. 7.8)"
        value={formData.cgpa}
        onChange={handleChange}
      />

      <button onClick={handleSubmit}>Analyze Profile</button>
    </div>
  )
}

export default InputForm