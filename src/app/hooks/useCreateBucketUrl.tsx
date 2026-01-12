const useCreateBucketUrl = (
  value?: string,
  fallback: string = "/images/placeholder-user.jpg",
) => {
  if (!value) return fallback;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("blob:") || value.startsWith("data:")) return value;
  if (value.startsWith("/")) return value;
  return `/${value}`;
};

export default useCreateBucketUrl;
