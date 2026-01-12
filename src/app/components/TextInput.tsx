import { TextInputCompTypes } from "../types"

export default function TextInput({ string, inputType, placeholder, error, onUpdate }: TextInputCompTypes) {

  return (
    <>
        <input 
            placeholder={placeholder}
            className="
                block
                w-full
                bg-[#F1F1F2]
                text-gray-800
                border
                border-gray-300
                rounded-md
                py-2.5
                px-3
                focus:outline-none
                placeholder:text-gray-500
                dark:bg-white/10
                dark:text-white
                dark:border-white/10
                dark:placeholder:text-white/50
            " 
            value={string || ''}
            onChange={(event) => onUpdate(event.target.value)}
            type={inputType}
            autoComplete="off"
        />

        <div className="text-[color:var(--brand-accent-text)] text-[14px] font-semibold">
            {error ? (error) : null}
        </div>
    </>
  )
}
