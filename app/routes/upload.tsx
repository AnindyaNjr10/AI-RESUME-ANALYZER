import {type FormEvent, useState} from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2img";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file)
    }

    const parseFeedbackText = (content: unknown) => {
        if (typeof content === 'string') {
            return content;
        }

        if (Array.isArray(content)) {
            return content
                .map((item) =>
                    typeof item === 'string'
                        ? item
                        : item && typeof item === 'object'
                        ? (item as any).text || JSON.stringify(item)
                        : ''
                )
                .join('');
        }

        if (content && typeof content === 'object') {
            return JSON.stringify(content);
        }

        return '';
    };

    const extractJson = (text: string) => {
        let cleaned = text.trim();
        cleaned = cleaned.replace(/^```json\n?/, '').replace(/```$/, '').trim();

        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleaned = cleaned.slice(firstBrace, lastBrace + 1);
        }

        return cleaned;
    };

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File  }) => {
        setIsProcessing(true);

        try {
            setStatusText('Uploading the file...');
            const uploadedFile = await fs.upload([file]);
            if(!uploadedFile) throw new Error('Failed to upload file');

            setStatusText('Converting to image...');
            const imageFile = await convertPdfToImage(file);
            if(!imageFile.file) throw new Error(imageFile.error || 'Failed to convert PDF to image');

            setStatusText('Uploading the image...');
            const uploadedImage = await fs.upload([imageFile.file]);
            if(!uploadedImage) throw new Error('Failed to upload image');

            setStatusText('Preparing data...');
            const uuid = generateUUID();
            const data = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName,
                jobTitle,
                jobDescription,
                feedback: '',
            };
            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText('Analyzing...');

            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription })
            );
            if (!feedback) throw new Error('Failed to analyze resume');

            const content = feedback?.message?.content;
            const feedbackText = extractJson(parseFeedbackText(content));

            let parsedFeedback;
            try {
                parsedFeedback = JSON.parse(feedbackText);
            } catch (parseError) {
                throw new Error(`Failed to parse analysis response: ${feedbackText.slice(0, 200)}`);
            }

            data.feedback = parsedFeedback;
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setStatusText('Analysis complete, redirecting...');
            navigate(`/resume/${uuid}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('Upload analyze error:', err);
            setStatusText(`Error: ${message}`);
            setIsProcessing(false);
        }
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if(!file) {
            setStatusText('Please select a PDF resume file before analyzing.');
            return;
        }

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <>
                            <h2>Drop your resume for an ATS score and improvement tips</h2>
                            {statusText.startsWith('Error') && (
                                <p className="text-red-600 mt-4">{statusText}</p>
                            )}
                        </>
                    )}
                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name="company-name" placeholder="Company Name" id="company-name" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="Job Title" id="job-title" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}
export default Upload
