with open("src/components/ViewAllModal.tsx", "r") as f:
    content = f.read()

replacements = [
    (
        '''                                            <div 
                                                key={item.id || idx} 
                                                className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-emerald-300 group ${isPlaceholder ? 'opacity-80' : ''}`}
                                            >''',
        '''                                            <div 
                                                key={item.id || idx} 
                                                className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-emerald-300 group cursor-pointer ${isPlaceholder ? 'opacity-80' : ''}`}
                                                onClick={(e) => {
                                                    if (isPlaceholder) {
                                                        window.open(item.blogUrl, '_blank', 'noopener,noreferrer');
                                                    } else {
                                                        setSelectedPostId(item.id);
                                                        setActiveSection('detail');
                                                        onClose();
                                                    }
                                                }}
                                            >'''
    ),
    (
        '''                                                        <button 
                                                            onClick={(e) => {
                                                                if (isPlaceholder) {''',
        '''                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isPlaceholder) {'''
    ),
    (
        '''                                                        <button 
                                                            onClick={(e) => openPhoneSelectModal(e, item.mobilePhone || '010-4065-2751')}''',
        '''                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openPhoneSelectModal(e, item.mobilePhone || '010-4065-2751');
                                                            }}'''
    )
]

for orig, repl in replacements:
    content = content.replace(orig, repl)

with open("src/components/ViewAllModal.tsx", "w") as f:
    f.write(content)
