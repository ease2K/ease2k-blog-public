import Blog from "@/components/blog";

export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return <Blog initialPath={"/" + path.join("/")} />;
}
