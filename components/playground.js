import React, { useState } from "react"
import Property from "./property"
import Examples from "./examples"
import API from "./api"
import Response from "./response"
import Spinner from "./spinner"

const Playground = () => {
  const [isScraping, setIsScraping] = useState(false)
  const [error, setError] = useState(null)
  const [url, setUrl] = useState("")
  const [multiple, setMultiple] = useState(false)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [indexScraping, setIndexScraping] = useState(0)
  const [properties, setProperties] = useState([{ name: "", selector: "" }])
  const [result, setResult] = useState(null)

  const onPropertyChange = (index, name, selector, type) => {
    let newProperties = [...properties]
    newProperties[index] = { name, selector, type } // replace e.target.value with whatever you want to change it to
    setProperties(newProperties)
    setResult(null)
    setError(null)
  }

  const onAddProperty = (e) => {
    e.preventDefault()
    setProperties([...properties, { name: "", selector: "", type: "text" }])
    setResult(null)
    setError(null)
  }

  const onRemoveProperty = (index) => {
    const newProperties = properties.filter((p, i) => index !== i)
    setProperties(newProperties)
    setResult(null)
    setError(null)
  }

  const onSelectExample = (example) => {
    if (typeof example === "object") {
      setUrl(example.url)
      setMultiple(example.multiple?? false)
      setFrom(example.from?? "")
      setTo(example.to?? "")
      setProperties(example.properties)
      setResult(null)
      setTimeout(() => {
        document
          .getElementById("playground")
          .scrollIntoView({ behavior: "smooth" })
      }, 100)
    } else {
      setUrl("")
      setProperties([{ name: "", selector: "", type: "text" }])
      setResult(null)
    }
    setError(null)
  }

  const scrape = async (e) => {
    e.preventDefault()
    setResult(null)
    setIsScraping(true)
    setError(false)
    if (url.indexOf("http") !== 0) {
      setUrl("https://" + url)
    }
    if (multiple) {
      for (let i = from; i <= to; i++) {
        setIndexScraping(i)
        const pageUrl = url.replace('{{page_number}}', i)
        await fetchScrape(pageUrl)
      }
    } else {
      await fetchScrape(url)
    }
    setIsScraping(false)
    document
      .getElementById("scrapeButton")
      .scrollIntoView({ behavior: "smooth" })
  }

  const fetchScrape = async (url) => {
    return await fetch("/api/scrape", {
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json" }),
      credentials: "same-origin",
      body: JSON.stringify({
        url: url.indexOf("http") !== 0 ? "https://" + url : url,
        properties,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.statusCode === 200) {
          if (data.result.length === 0) {
            setResult(
              "Property selector found no html element matches for html \n" +
                "Note: \n" +
                "Websites rendered via JavaScript can be parsed in a local environment but not when hosted on Vercel\n" +
                "Also some websites put measures in place to block scraping:\n\n" +
                "HTML loaded is:\n" +
                data.html
            )
          } else {
            setResult((prevResult) => {
              return JSON.stringify([
                ...JSON.parse(prevResult)?? [],
                ...data.result
              ], null, 2)
            })
          }
        } else {
          setError("Oops! Something went wrong: " + data.error)
          setIsScraping(false)
        }
      })
      .catch((error) => {
        setError("Oops! Something went wrong: " + error.message)
        setIsScraping(false)
      })
  }

  return (
    <>
      <form id="playground" onSubmit={scrape}>
        <Examples onSelect={onSelectExample} />
        <div>
          <label className="heading" htmlFor="url">
            URL to Scrape
          </label>
        </div>
        <input
          id="url"
          name="url"
          value={url}
          required={true}
          onChange={(e) => {
            setUrl(e.target.value)
          }}
        />
        <div className="form-horizontal">
          <input
            id="multi-pages"
            type="checkbox"
            checked={multiple}
            onChange={(e) => {
              setMultiple(e.target.checked)
            }}
          />
          <label htmlFor="multi-pages">Multiple pages</label>
        </div>
        {
          multiple && (
            <>
              <small>insert <strong>{'{{page_number}}'}</strong> to URL in order to be replaced with</small>
              <div className="form-horizontal">
                <div>
                  <div>
                    <label htmlFor="from">From</label>
                  </div>
                  <input
                    type="number"
                    id="from"
                    value={from}
                    required={true}
                    onChange={(e) => {
                      setFrom(e.target.value)
                    }}
                  />
                </div>
                <div>
                  <div>
                    <label htmlFor="to">To</label>
                  </div>
                  <input
                    type="number"
                    name="to"
                    value={to}
                    required={true}
                    onChange={(e) => {
                      setTo(e.target.value)
                    }}
                  />
                </div>
              </div>
            </>
          )
        }
        <h3 className="heading">Data</h3>
        <div className="properties">
          {properties.map((property, index) => (
            <Property
              key={"property" + index}
              index={index}
              canDelete={properties.length > 1}
              onChange={onPropertyChange}
              onRemove={onRemoveProperty}
              name={property.name}
              selector={property.selector}
              type={property.type}
            />
          ))}
          <button onClick={onAddProperty}>+ Add Property</button>
        </div>
        {error && <p className="error">{error}</p>}
        <div>
          <button id="scrapeButton" disabled={isScraping}>
            {
              isScraping
                ? <>
                    <Spinner />
                    {
                      multiple
                        ? `Scraping page ${indexScraping} of ${to}`
                        : 'Scraping'
                    }
                  </>
                : "Scrape"
            }
          </button>
        </div>
      </form>

      {properties[0].name !== "" && result && (
        <>
          <Response>{result}</Response>
          <API url={url} properties={properties} />
        </>
      )}

      <style jsx>{`
        .heading {
          font-weight: 500;
          font-size: 18px;
        }
        h3 {
          margin: 16px 0 4px;
        }
        form {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          white-space: nowrap;
        }
        input {
          padding: 8px 16px;
          margin-bottom: 16px;
          width: 100%;
          max-width: 480px;
        }
        input[type="number"] {
          width: 100px;
        }
        button {
          display: flex;
          font-size: 24px;
          padding: 24px 64px;
        }
        .form-horizontal {
          display: flex;
          gap: 8px;
        }
        .properties {
          max-width: 480px;
          margin: auto;
          text-align: left;
        }
        .properties button {
          font-size: 16px;
          margin-bottom: 32px;
          padding: 0 1px 8px;
          background: white;
          color: #067df7;
        }
        .output {
          text-align: left;
          width: 100%;
          max-width: 800px;
          padding: 16px;
          background: #eee;
          color: #444;
          margin: 16px auto;
          overflow-x: scroll;
        }
        .error {
          max-width: 720px;
          margin: 0 auto 32px;
          color: red;
        }
      `}</style>
    </>
  )
}

export default Playground
