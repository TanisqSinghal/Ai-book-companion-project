import UploadForm from "@/components/UploadForm";

const page = () => {
    return (
        <main className="wrapper container">
            <div className="mx-auto max-w-180 space-y-10">
                <section className="flex flex-col gap-5">
                    <h1 className="page-title-xl">Add New Book</h1>
                    <p className="subtitle"> Upload a pdf to generate your interactive interview</p>

                </section>

                <UploadForm />
            </div>
        </main>
    )
}

export default page; 