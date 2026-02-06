'use client'

import { useState, useEffect } from 'react'
import { Gift, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function DonationWidget() {
    const [isOpen, setIsOpen] = useState(false)

    // 初回マウント時に自動で開く
    useEffect(() => {
        // (オプション: sessionStorageを使って「訪問済みなら開かない」制御も可能だが、
        // 今回はシンプルに「最初は表示」という指示に従う)
        const hasSeen = sessionStorage.getItem('gaplog-donation-seen')
        if (!hasSeen) {
            setIsOpen(true)
            sessionStorage.setItem('gaplog-donation-seen', 'true')
        }
    }, [])

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        className="h-10 w-10 rounded-full shadow-lg p-0 bg-pink-500 hover:bg-pink-600 text-white"
                        variant="default"
                        size="icon"
                        aria-label="支援する"
                    >
                        <Gift className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-80 p-0 overflow-hidden border-none shadow-xl mr-4 mb-2 relative"
                    align="end"
                    side="top"
                >
                    {/* 閉じるボタン */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 text-gray-400 hover:text-gray-600 z-10"
                        onClick={() => setIsOpen(false)}
                    >
                        <X className="w-4 h-4" />
                    </Button>

                    <div className="bg-white p-4 flex flex-col items-center gap-4 pt-6">
                        <div className="text-center">
                            <h3 className="font-bold text-lg mb-1">GapLogを支援する</h3>
                            <p className="text-sm text-gray-500">
                                開発者をサポートして、より良いアプリにしませんか？
                            </p>
                        </div>

                        <a
                            href="https://doneru.jp/takoyakiii"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full transition-transform hover:scale-105"
                        >
                            {/* ユーザー提供画像を public/doneru_banner.png に配置する前提 */}
                            <img
                                src="/doneru_banner.png"
                                alt="Doneruで支援する"
                                className="w-full rounded-lg shadow-sm border"
                            />
                        </a>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
