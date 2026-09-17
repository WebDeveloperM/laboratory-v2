
export default function Skeleton() {
    return (

        <div className="flex w-full flex-col gap-4 m-4 pr-10">
            <div className="skeleton h-32 w-full !bg-white"></div>
            <div className="skeleton h-4 w-28 !bg-white"></div>
            <div className="skeleton h-4 w-full !bg-white"></div>
            <div className="skeleton h-4 w-full !bg-white"></div>
        </div>

    )
}
